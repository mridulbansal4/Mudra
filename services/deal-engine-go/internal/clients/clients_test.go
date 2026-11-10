package clients

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestScrubPIIGo(t *testing.T) {
	in := "Call me on +91 98765 43210 or 9876543210, Aadhaar 2345 6789 0123, PAN ABCDE1234F, IFSC HDFC0001234, pay vikram.s@okaxis or mail a.b@example.com. Price ₹1,45,000 at 4800 RPM."
	res := ScrubPIIGo(in)
	for _, leak := range []string{"98765", "9876543210", "2345 6789 0123", "ABCDE1234F", "HDFC0001234", "vikram.s@okaxis", "a.b@example.com"} {
		if strings.Contains(res.ScrubbedText, leak) {
			t.Errorf("leaked %q in %q", leak, res.ScrubbedText)
		}
	}
	if !strings.Contains(res.ScrubbedText, "₹1,45,000") || !strings.Contains(res.ScrubbedText, "4800 RPM") {
		t.Errorf("over-redacted: %q", res.ScrubbedText)
	}
	if res.RedactedCount != 7 {
		t.Errorf("redacted_count=%d want 7 (%v) %q", res.RedactedCount, res.Categories, res.ScrubbedText)
	}
	if res.Engine != EngineGoFallback {
		t.Error("engine label")
	}
}

func TestHamming(t *testing.T) {
	d, err := HammingGo("a4f19c83e2b0771d", "a4f19c83e2b0771e")
	if err != nil || d != 2 {
		t.Fatalf("d=%d err=%v", d, err)
	}
	if _, err := HammingGo("zz", "00"); err == nil {
		t.Fatal("expected error")
	}
}

func testJPEG(t *testing.T, shift int) []byte {
	img := image.NewRGBA(image.Rect(0, 0, 160, 120))
	for y := 0; y < 120; y++ {
		for x := 0; x < 160; x++ {
			v := uint8((x*2 + y + shift) % 256)
			if (x/20+y/20)%2 == 0 {
				v = 255 - v
			}
			img.Set(x, y, color.RGBA{v, v / 2, 255 - v, 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestPHashGo(t *testing.T) {
	a, err := PHashGo(testJPEG(t, 0))
	if err != nil || len(a) != 16 {
		t.Fatalf("phash %q err %v", a, err)
	}
	a2, _ := PHashGo(testJPEG(t, 0))
	if a != a2 {
		t.Fatal("pHash not deterministic")
	}
	b, _ := PHashGo(testJPEG(t, 3))
	d, _ := HammingGo(a, b)
	if d > 16 {
		t.Errorf("near-identical frames too far apart: %d", d)
	}
	if _, err := PHashGo([]byte("not a jpeg")); err == nil {
		t.Fatal("expected decode error")
	}
}

func sinePCM(freq float64, sr int, secs float64) []byte {
	n := int(float64(sr) * secs)
	buf := make([]byte, n*4)
	for i := 0; i < n; i++ {
		v := 0.6*math.Sin(2*math.Pi*freq*float64(i)/float64(sr)) + 0.05*math.Sin(2*math.Pi*3000*float64(i)/float64(sr))
		binary.LittleEndian.PutUint32(buf[i*4:], math.Float32bits(float32(v)))
	}
	return buf
}

func TestRPMFromPCMGo(t *testing.T) {
	rpm, err := RPMFromPCMGo(sinePCM(80.34, 48000, 2), 48000)
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(rpm-4820) > 20 {
		t.Fatalf("rpm=%.1f want ~4820", rpm)
	}
}

func TestVerifyAssayGoFallback(t *testing.T) {
	r := NewRust("", "", NewGoSigner(make([]byte, 32)))
	out := r.VerifyAssay(context.Background(), AssayInput{
		FrameJPEGBase64: "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(testJPEG(t, 0)),
		AudioPCMBase64:  base64.StdEncoding.EncodeToString(sinePCM(80.34, 48000, 2)),
		SampleRate:      48000, MinMotorRPM: 4800, ReferencePHashHex: "a4f19c83e2b0771d",
	})
	if out.Engine != EngineGoFallback || out.FramePHashHex == "" || out.AudioFFTRPMPeak == nil || out.RPMOk == nil || !*out.RPMOk || out.HammingDistance == nil {
		t.Fatalf("bad fallback output %+v", out)
	}
	client := 4900.0
	out = r.VerifyAssay(context.Background(), AssayInput{FrameJPEGBase64: base64.StdEncoding.EncodeToString(testJPEG(t, 0)), ClientReportedRPM: &client, MinMotorRPM: 4800})
	if out.RPMSource != "client-reported" || *out.AudioFFTRPMPeak != 4900 {
		t.Fatalf("client rpm not used: %+v", out)
	}
}

func TestVoucherChainAndSignature(t *testing.T) {
	g := NewGoSigner(bytes.Repeat([]byte{7}, 32))
	p := map[string]any{"b": 2, "a": "x<y", "n": map[string]any{"z": 1, "y": []int{1, 2}}}
	v1, err := g.Sign("d_1", "ESCROW_LOCKED", p, GenesisHash)
	if err != nil {
		t.Fatal(err)
	}
	if !VerifyVoucher(v1.PublicKeyHex, v1.CurrHashHex, v1.SignatureHex) {
		t.Fatal("signature does not verify")
	}
	cj, _ := CanonicalJSON(p)
	if string(cj) != `{"a":"x<y","b":2,"n":{"y":[1,2],"z":1}}` {
		t.Fatalf("canonical json %s", cj)
	}
	v2, _ := g.Sign("d_1", "ASSAY_STARTED", map[string]any{"k": 1}, v1.CurrHashHex)
	want, _ := ChainHash(v1.CurrHashHex, "d_1", "ASSAY_STARTED", map[string]any{"k": 1})
	if v2.CurrHashHex != want || v2.CurrHashHex == v1.CurrHashHex {
		t.Fatal("chain hash mismatch")
	}
	if VerifyVoucher(v1.PublicKeyHex, v2.CurrHashHex, v1.SignatureHex) {
		t.Fatal("signature verified against wrong hash")
	}
}

func TestTribunalGo(t *testing.T) {
	r := TribunalGo(TribunalInput{DealTitle: "Juki", AmountPaise: 14500000, ReasonCode: "TRANSIT_DAMAGE", HammingDistance: 2})
	if r.BuyerRefundBps != 1200 || r.SellerPayoutBps != 8800 {
		t.Fatalf("split %d/%d", r.BuyerRefundBps, r.SellerPayoutBps)
	}
	r = TribunalGo(TribunalInput{AmountPaise: 100, ReasonCode: "SERIAL_MISMATCH", HammingDistance: 30})
	if r.BuyerRefundBps != 10000 {
		t.Fatalf("expected full refund, got %d", r.BuyerRefundBps)
	}
	for _, rc := range []string{"TRANSIT_DAMAGE", "SERIAL_MISMATCH", "SLA_BREACH"} {
		for h := 0; h <= 64; h++ {
			x := TribunalGo(TribunalInput{AmountPaise: 1, ReasonCode: rc, HammingDistance: h})
			if x.BuyerRefundBps+x.SellerPayoutBps != 10000 || x.BuyerRefundBps%50 != 0 {
				t.Fatalf("%s h=%d bad split %d/%d", rc, h, x.BuyerRefundBps, x.SellerPayoutBps)
			}
		}
	}
}

func TestFormatINR(t *testing.T) {
	cases := map[int64]string{14500000: "1,45,000", 1740000: "17,400", 5200000: "52,000", 99: "0.99", 1234567890: "1,23,45,678.90"}
	for p, want := range cases {
		if got := FormatINR(p); got != want {
			t.Errorf("FormatINR(%d)=%s want %s", p, got, want)
		}
	}
}

func TestExtractTermsGo(t *testing.T) {
	tm := ExtractTermsGo("நான் ₹1,45,000-க்கு வாங்க தயார், மோட்டார் 4800 RPM, 6 months warranty")
	if tm.OfferedAmountPaise == nil || *tm.OfferedAmountPaise != 14500000 || tm.RequiredRPM == nil || *tm.RequiredRPM != 4800 || tm.WarrantyMonths == nil || *tm.WarrantyMonths != 6 {
		t.Fatalf("terms %+v", tm)
	}
}

func TestInternalHMAC(t *testing.T) {
	now := time.Unix(1794320500, 0)
	sig := SignInternal("s3cret", "1794320500", []byte(`{"a":1}`))
	if !VerifyInternal("s3cret", "1794320500", sig, []byte(`{"a":1}`), now) {
		t.Fatal("valid signature rejected")
	}
	if VerifyInternal("s3cret", "1794320500", sig, []byte(`{"a":2}`), now) {
		t.Fatal("tampered body accepted")
	}
	if VerifyInternal("s3cret", "1794320500", sig, []byte(`{"a":1}`), now.Add(301*time.Second)) {
		t.Fatal("stale timestamp accepted")
	}
}

// The client must sign requests per contract §5 and use the bridge's answer when up.
func TestBridgeClientSignsAndUsesLive(t *testing.T) {
	var gotSig bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body := new(bytes.Buffer)
		body.ReadFrom(r.Body)
		gotSig = VerifyInternal("k", r.Header.Get("X-Internal-Timestamp"), r.Header.Get("X-Internal-Signature"), body.Bytes(), time.Now())
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"access_token":"nc_tok_x","app_key":"ak","expires_in_sec":86400,"mode":"live"}`))
	}))
	defer srv.Close()
	b := NewBridge(srv.URL, "k", "")
	tok := b.IssueToken(context.Background(), "u1", "U", "")
	if !gotSig || tok.AccessToken != "nc_tok_x" || tok.Engine != EngineBridgeLive {
		t.Fatalf("sig=%v tok=%+v", gotSig, tok)
	}
}

func TestBridgeFallbackWhenDown(t *testing.T) {
	b := NewBridge("http://127.0.0.1:1", "", "")
	start := time.Now()
	tok := b.IssueToken(context.Background(), "u1", "U", "")
	if !strings.HasPrefix(tok.AccessToken, "sim_") || tok.Engine != EngineGoFallback {
		t.Fatalf("tok=%+v", tok)
	}
	// circuit is now open: second call must be instant
	t2 := time.Now()
	b.Freeze(context.Background(), "c", true)
	if time.Since(t2) > 50*time.Millisecond {
		t.Fatalf("circuit not open, took %v (first %v)", time.Since(t2), t2.Sub(start))
	}
}

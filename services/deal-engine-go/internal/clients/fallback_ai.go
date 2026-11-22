package clients

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// ExtractedTerms mirrors the bridge's extracted_terms object.
type ExtractedTerms struct {
	OfferedAmountPaise *int64 `json:"offered_amount_paise,omitempty"`
	RequiredRPM        *int64 `json:"required_rpm,omitempty"`
	WarrantyMonths     *int64 `json:"warranty_months,omitempty"`
}

var (
	reRupee    = regexp.MustCompile(`(?i)(?:₹|rs\.?|inr)\s?([0-9][0-9,]*(?:\.[0-9]+)?)`)
	reRupeeSuf = regexp.MustCompile(`(?i)([0-9][0-9,]*)\s?(?:rupees|rupaye|रुपये|रुपए|ரூபாய்)`)
	reLakh     = regexp.MustCompile(`(?i)([0-9]+(?:\.[0-9]+)?)\s?(?:lakh|lac|लाख|லட்சம்)`)
	reRPM      = regexp.MustCompile(`(?i)([0-9][0-9,]*)\s?rpm`)
	reWarranty = regexp.MustCompile(`(?i)([0-9]+)\s?(?:-\s?)?(?:months?|mahine|महीने|महीना|माह|மாத)`)
)

func parseNum(s string) (float64, bool) {
	f, err := strconv.ParseFloat(strings.ReplaceAll(s, ",", ""), 64)
	return f, err == nil
}

// ExtractTermsGo pulls price / RPM / warranty out of free text (deterministic).
func ExtractTermsGo(text string) ExtractedTerms {
	var t ExtractedTerms
	set := func(p **int64, v int64) { *p = &v }
	if m := reLakh.FindStringSubmatch(text); m != nil {
		if f, ok := parseNum(m[1]); ok {
			set(&t.OfferedAmountPaise, int64(math.Round(f*100000*100)))
		}
	} else if m := reRupee.FindStringSubmatch(text); m != nil {
		if f, ok := parseNum(m[1]); ok {
			set(&t.OfferedAmountPaise, int64(math.Round(f*100)))
		}
	} else if m := reRupeeSuf.FindStringSubmatch(text); m != nil {
		if f, ok := parseNum(m[1]); ok {
			set(&t.OfferedAmountPaise, int64(math.Round(f*100)))
		}
	}
	if m := reRPM.FindStringSubmatch(text); m != nil {
		if f, ok := parseNum(m[1]); ok {
			set(&t.RequiredRPM, int64(f))
		}
	}
	if m := reWarranty.FindStringSubmatch(text); m != nil {
		if f, ok := parseNum(m[1]); ok && f <= 120 {
			set(&t.WarrantyMonths, int64(f))
		}
	}
	return t
}

// TranslateGo is the degraded-mode "translation": we have no MT model in Go,
// so we return the PII-scrubbed source tagged with the locale pair. Honest by design.
func TranslateGo(text, src, dst string) (string, ExtractedTerms, int) {
	sc := ScrubPIIGo(text)
	terms := ExtractTermsGo(sc.ScrubbedText)
	if src == dst {
		return sc.ScrubbedText, terms, sc.RedactedCount
	}
	return fmt.Sprintf("[%s→%s · translation offline] %s", src, dst, sc.ScrubbedText), terms, sc.RedactedCount
}

// TribunalInput / TribunalResult mirror the bridge /internal/ai/tribunal contract.
type TribunalInput struct {
	DealTitle       string   `json:"deal_title"`
	AmountPaise     int64    `json:"amount_paise"`
	ReasonCode      string   `json:"reason_code"`
	Description     string   `json:"description"`
	HammingDistance int      `json:"hamming_distance"`
	RPMPeak         *float64 `json:"rpm_peak,omitempty"`
}

type TribunalResult struct {
	Summary         string `json:"summary"`
	BuyerRefundBps  int    `json:"buyer_refund_bps"`
	SellerPayoutBps int    `json:"seller_payout_bps"`
	Rationale       string `json:"rationale"`
	Model           string `json:"model"`
	Engine          string `json:"engine"`
}

// TribunalGo is a deterministic split: base by reason code plus a per-bit
// pHash penalty, rounded to 50 bps. Hamming > 20 (visually different item)
// means full refund. TRANSIT_DAMAGE at distance 2 yields the spec's 12/88.
func TribunalGo(in TribunalInput) TribunalResult {
	var base, perBit, ceil int
	switch in.ReasonCode {
	case "SERIAL_MISMATCH":
		base, perBit, ceil = 7000, 150, 10000
	case "SLA_BREACH":
		base, perBit, ceil = 1500, 100, 4000
	default: // TRANSIT_DAMAGE
		base, perBit, ceil = 600, 300, 6000
	}
	h := max(0, in.HammingDistance)
	bps := base + perBit*h
	if in.RPMPeak != nil && *in.RPMPeak > 0 && *in.RPMPeak < 4000 {
		bps += 1500 // motor underperforming
	}
	bps = min(bps, ceil)
	if h > 20 {
		bps = 10000
	}
	bps = (bps + 25) / 50 * 50
	bps = min(10000, max(0, bps))
	refund := in.AmountPaise * int64(bps) / 10000
	summary := fmt.Sprintf("Rule-based recommendation (AI unavailable): %s on %q, pHash Hamming distance %d → buyer refund %d bps (₹%s), seller payout %d bps.",
		in.ReasonCode, in.DealTitle, h, bps, FormatINR(refund), 10000-bps)
	rationale := fmt.Sprintf("Rule: base %d bps for %s + %d bps per differing pHash bit (cap %d); distance >20 bits ⇒ full refund. Rounded to 50 bps.", base, in.ReasonCode, perBit, ceil)
	return TribunalResult{Summary: summary, BuyerRefundBps: bps, SellerPayoutBps: 10000 - bps, Rationale: rationale, Model: "go-deterministic-tribunal-v1", Engine: EngineGoFallback}
}

// FormatINR formats paise as Indian-grouped rupees, e.g. 14500000 -> "1,45,000".
func FormatINR(paise int64) string {
	neg := paise < 0
	if neg {
		paise = -paise
	}
	r := paise / 100
	s := strconv.FormatInt(r, 10)
	if len(s) > 3 {
		head, tail := s[:len(s)-3], s[len(s)-3:]
		var parts []string
		for len(head) > 2 {
			parts = append([]string{head[len(head)-2:]}, parts...)
			head = head[:len(head)-2]
		}
		if head != "" {
			parts = append([]string{head}, parts...)
		}
		s = strings.Join(parts, ",") + "," + tail
	}
	if p := paise % 100; p != 0 {
		s += fmt.Sprintf(".%02d", p)
	}
	if neg {
		return "-" + s
	}
	return s
}

// ShopkeeperInput mirrors /internal/ai/shopkeeper.
type ShopkeeperInput struct {
	ItemTitle          string `json:"item_title"`
	StickerPricePaise  int64  `json:"sticker_price_paise"`
	CounterOfferPaise  int64  `json:"counter_offer_paise"`
	Accepted           bool   `json:"accepted"`
	OfferedAmountPaise int64  `json:"offered_amount_paise"`
	MessageText        string `json:"message_text"`
	Locale             string `json:"locale"`
}

// ShopkeeperGo returns a template reply; Go already decided the price.
func ShopkeeperGo(in ShopkeeperInput) string {
	price := "₹" + FormatINR(in.CounterOfferPaise)
	offer := "₹" + FormatINR(in.OfferedAmountPaise)
	switch {
	case strings.HasPrefix(in.Locale, "hi"):
		if in.Accepted {
			return fmt.Sprintf("Theek hai bhai, %s pakka! %s aapka hua, UPI escrow lock kar dijiye.", price, in.ItemTitle)
		}
		return fmt.Sprintf("%s mein toh mera nuksaan hai. %s se kam nahi hoga, last offer.", offer, price)
	case strings.HasPrefix(in.Locale, "ta"):
		if in.Accepted {
			return fmt.Sprintf("சரி, %s-க்கு டீல்! %s உங்களுடையது, UPI escrow லாக் பண்ணுங்க.", price, in.ItemTitle)
		}
		return fmt.Sprintf("%s ரொம்ப குறைவு. %s தான் கடைசி விலை.", offer, price)
	case strings.HasPrefix(in.Locale, "mr"):
		if in.Accepted {
			return fmt.Sprintf("ठीक आहे, %s ला डील पक्की! %s तुमचा, UPI escrow लॉक करा.", price, in.ItemTitle)
		}
		return fmt.Sprintf("%s खूप कमी आहे. %s पेक्षा कमी नाही.", offer, price)
	default:
		if in.Accepted {
			return fmt.Sprintf("Done, %s it is! The %s is yours. Lock the UPI escrow and I'll start the live inspection.", price, in.ItemTitle)
		}
		return fmt.Sprintf("%s? You're robbing me! Best I can do is %s, and that's with the warranty.", offer, price)
	}
}

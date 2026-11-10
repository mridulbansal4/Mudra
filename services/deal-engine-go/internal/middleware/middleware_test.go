package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestJWTRoundTripAndTamper(t *testing.T) {
	j := NewJWT("secret")
	tok, err := j.Issue(Claims{Sub: "u1", NexconnID: "nx1", Role: "buyer"})
	if err != nil {
		t.Fatal(err)
	}
	c, err := j.Verify(tok)
	if err != nil || c.Sub != "u1" || c.Role != "buyer" {
		t.Fatalf("verify: %+v %v", c, err)
	}
	if _, err := NewJWT("other").Verify(tok); err != ErrTokenSignature {
		t.Fatalf("want signature error, got %v", err)
	}
	parts := strings.Split(tok, ".")
	if _, err := j.Verify(parts[0] + "." + parts[1] + "x." + parts[2]); err == nil {
		t.Fatal("tampered payload accepted")
	}
	// alg=none must be rejected
	if _, err := j.Verify("eyJhbGciOiJub25lIn0." + parts[1] + "."); err == nil {
		t.Fatal("alg none accepted")
	}
	exp := &JWT{secret: []byte("secret"), ttl: -time.Minute}
	old, _ := exp.Issue(Claims{Sub: "u"})
	if _, err := j.Verify(old); err != ErrTokenExpired {
		t.Fatalf("want expired, got %v", err)
	}
}

func TestRequireAuthRBAC(t *testing.T) {
	j := NewJWT("s")
	h := j.RequireAuth(false, "arbitrator")(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })
	buyer, _ := j.Issue(Claims{Sub: "b", Role: "buyer"})
	arb, _ := j.Issue(Claims{Sub: "a", Role: "arbitrator"})
	for tok, want := range map[string]int{"": 401, "garbage": 401, buyer: 403, arb: 204} {
		r := httptest.NewRequest("POST", "/x", nil)
		if tok != "" {
			r.Header.Set("Authorization", "Bearer "+tok)
		}
		w := httptest.NewRecorder()
		h(w, r)
		if w.Code != want {
			t.Errorf("token %.10q: got %d want %d", tok, w.Code, want)
		}
	}
	// query-param auth only when allowed
	hq := j.RequireAuth(true)(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })
	w := httptest.NewRecorder()
	hq(w, httptest.NewRequest("GET", "/x?access_token="+buyer, nil))
	if w.Code != 204 {
		t.Fatalf("query auth got %d", w.Code)
	}
}

func TestIdempotencyReplay(t *testing.T) {
	idem := NewIdempotency(time.Hour)
	var calls atomic.Int64
	h := idem.Wrap(func(w http.ResponseWriter, r *http.Request) {
		n := calls.Add(1)
		WriteJSON(w, 201, map[string]int64{"n": n})
	})
	do := func(key, path string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("POST", path, nil)
		if key != "" {
			r.Header.Set("X-Idempotency-Key", key)
		}
		w := httptest.NewRecorder()
		h(w, r)
		return w
	}
	a := do("k1", "/a")
	b := do("k1", "/a")
	if a.Code != 201 || b.Code != 201 || a.Body.String() != b.Body.String() || b.Header().Get("Idempotent-Replay") != "true" {
		t.Fatalf("replay failed: %d %q / %d %q", a.Code, a.Body.String(), b.Code, b.Body.String())
	}
	if calls.Load() != 1 {
		t.Fatalf("handler ran %d times", calls.Load())
	}
	do("k1", "/b") // same key, different route = different entry
	do("", "/a")   // no key = no caching
	if calls.Load() != 3 {
		t.Fatalf("calls=%d want 3", calls.Load())
	}
	// expiry
	idem.now = func() time.Time { return time.Now().Add(2 * time.Hour) }
	do("k1", "/a")
	if calls.Load() != 4 {
		t.Fatal("expired entry was replayed")
	}
}

func TestIdempotencyConcurrentSingleExecution(t *testing.T) {
	idem := NewIdempotency(time.Hour)
	var calls atomic.Int64
	h := idem.Wrap(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		time.Sleep(20 * time.Millisecond)
		WriteJSON(w, 200, map[string]string{"ok": "1"})
	})
	var wg sync.WaitGroup
	var ok200, conflict atomic.Int64
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := httptest.NewRequest("POST", "/a", nil)
			r.Header.Set("X-Idempotency-Key", "same")
			w := httptest.NewRecorder()
			h(w, r)
			switch w.Code {
			case 200:
				ok200.Add(1)
			case 409:
				conflict.Add(1)
			}
		}()
	}
	wg.Wait()
	if calls.Load() != 1 || ok200.Load()+conflict.Load() != 20 {
		t.Fatalf("calls=%d ok=%d conflict=%d", calls.Load(), ok200.Load(), conflict.Load())
	}
}

func TestCORS(t *testing.T) {
	h := CORS([]string{"http://localhost:5173"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }))
	r := httptest.NewRequest("OPTIONS", "/api/v1/deals", nil)
	r.Header.Set("Origin", "http://localhost:5173")
	r.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 204 || w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" || !strings.Contains(w.Header().Get("Access-Control-Allow-Headers"), "X-Idempotency-Key") {
		t.Fatalf("preflight: %d %v", w.Code, w.Header())
	}
	r = httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Origin", "http://evil.example")
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("disallowed origin got CORS header")
	}
}

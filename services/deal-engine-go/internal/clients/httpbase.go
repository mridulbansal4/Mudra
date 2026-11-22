// Package clients holds the internal HTTP clients for the Node Nexconn bridge
// (:4001) and the Rust assay verifier (:4003), plus native Go fallbacks used
// whenever either service is unreachable (IMPLEMENTATION_CONTRACT.md §2).
package clients

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// Engine labels reported in API responses.
const (
	EngineRust            = "rust"
	EngineGoFallback      = "go-fallback"
	EngineBridgeLive      = "bridge-live"
	EngineBridgeSimulated = "bridge-simulated"
)

// DefaultTimeout bounds every internal call (5s gives enough headroom for cloud roundtrips to Singapore).
const DefaultTimeout = 5000 * time.Millisecond

// SlowAITimeout bounds internal calls that wait on a larger model (the AI tribunal): the bridge gives
// Gemini up to GEMINI_TIMEOUT_MS, so Go must wait longer than that or it always falls back.
const SlowAITimeout = 15000 * time.Millisecond

// circuitOpenFor: after a failure we skip the service for this long (Windows
// can take ~2s to report "connection refused" on localhost, so without this
// every request would pay the full timeout while a sibling service is down).
const circuitOpenFor = 8 * time.Second

// ErrUnavailable is returned when the circuit is open.
var ErrUnavailable = errors.New("service unavailable (circuit open)")

// SignInternal computes hex(HMAC_SHA256(secret, timestamp + "." + body)) (contract §5).
func SignInternal(secret, timestamp string, body []byte) string {
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(timestamp))
	m.Write([]byte("."))
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

// VerifyInternal checks an internal signature with ±300s skew, constant-time.
func VerifyInternal(secret, timestamp, signature string, body []byte, now time.Time) bool {
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}
	if d := now.Unix() - ts; d > 300 || d < -300 {
		return false
	}
	want := SignInternal(secret, timestamp, body)
	return hmac.Equal([]byte(want), []byte(signature))
}

type service struct {
	name    string
	baseURL string
	secret  string
	hc      *http.Client

	mu        sync.Mutex
	downUntil time.Time
	reachable bool
	lastErr   string
	health    map[string]any
}

func newService(name, baseURL, secret string) *service {
	// The client itself allows the slowest call; each request is bounded by its own context deadline.
	return &service{name: name, baseURL: baseURL, secret: secret, hc: &http.Client{Timeout: SlowAITimeout}}
}

func (s *service) circuitOpen() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return time.Now().Before(s.downUntil)
}

func (s *service) markResult(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		if s.reachable || s.lastErr == "" {
			slog.Warn("internal service unreachable, using fallback", "service", s.name, "err", err.Error())
		}
		s.reachable = false
		s.lastErr = err.Error()
		s.downUntil = time.Now().Add(circuitOpenFor)
		return
	}
	if !s.reachable {
		slog.Info("internal service reachable", "service", s.name)
	}
	s.reachable = true
	s.lastErr = ""
	s.downUntil = time.Time{}
}

// postJSON POSTs req to path and decodes into resp within DefaultTimeout. Fails fast when circuit open.
func (s *service) postJSON(ctx context.Context, path string, req, resp any) error {
	return s.postJSONWithin(ctx, DefaultTimeout, path, req, resp)
}

// postJSONWithin is postJSON with an explicit per-call deadline.
func (s *service) postJSONWithin(ctx context.Context, timeout time.Duration, path string, req, resp any) error {
	if s.baseURL == "" {
		return ErrUnavailable
	}
	if s.circuitOpen() {
		return ErrUnavailable
	}
	body, err := json.Marshal(req)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	hr, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	hr.Header.Set("Content-Type", "application/json")
	if s.secret != "" {
		ts := strconv.FormatInt(time.Now().Unix(), 10)
		hr.Header.Set("X-Internal-Timestamp", ts)
		hr.Header.Set("X-Internal-Signature", SignInternal(s.secret, ts, body))
	}
	res, err := s.hc.Do(hr)
	if err != nil {
		s.markResult(err)
		return err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 4<<20))
	if res.StatusCode >= 500 {
		err := fmt.Errorf("%s %s -> %d", s.name, path, res.StatusCode)
		s.markResult(err)
		return err
	}
	s.markResult(nil) // service is up, even if it rejected this request
	if res.StatusCode >= 300 {
		return fmt.Errorf("%s %s -> %d: %s", s.name, path, res.StatusCode, truncate(string(raw), 200))
	}
	if resp != nil {
		if err := json.Unmarshal(raw, resp); err != nil {
			return fmt.Errorf("%s %s: bad json: %w", s.name, path, err)
		}
	}
	return nil
}

// probe calls GET /health and records reachability.
func (s *service) probe(ctx context.Context) {
	if s.baseURL == "" {
		return
	}
	ctx, cancel := context.WithTimeout(ctx, DefaultTimeout)
	defer cancel()
	hr, _ := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/health", nil)
	res, err := s.hc.Do(hr)
	if err != nil {
		s.markResult(err)
		return
	}
	defer res.Body.Close()
	var h map[string]any
	_ = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&h)
	if res.StatusCode != http.StatusOK {
		s.markResult(fmt.Errorf("health %d", res.StatusCode))
		return
	}
	s.mu.Lock()
	s.health = h
	s.mu.Unlock()
	s.markResult(nil)
}

// Status is a snapshot used by /health.
type Status struct {
	URL       string         `json:"url,omitempty"`
	Reachable bool           `json:"reachable"`
	LastError string         `json:"last_error,omitempty"`
	Health    map[string]any `json:"health,omitempty"`
}

func (s *service) status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	return Status{URL: s.baseURL, Reachable: s.reachable, LastError: s.lastErr, Health: s.health}
}

func (s *service) isReachable() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.reachable
}

// runProber probes every interval until ctx is cancelled.
func (s *service) runProber(ctx context.Context, every time.Duration) {
	s.probe(ctx)
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			s.probe(ctx)
		}
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

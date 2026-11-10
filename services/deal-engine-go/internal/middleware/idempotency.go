package middleware

import (
	"bytes"
	"net/http"
	"sync"
	"time"
)

type idemEntry struct {
	inFlight    bool
	status      int
	body        []byte
	contentType string
	expires     time.Time
}

// Idempotency caches POST responses keyed by (X-Idempotency-Key, method+path)
// for TTL (default 24 h). Replays return the cached status+body with
// `Idempotent-Replay: true`. A duplicate arriving while the first is still
// running gets 409 ERR_IDEMPOTENCY_IN_PROGRESS. 5xx responses are not cached.
type Idempotency struct {
	mu      sync.Mutex
	entries map[string]*idemEntry
	ttl     time.Duration
	now     func() time.Time
}

// NewIdempotency creates the cache.
func NewIdempotency(ttl time.Duration) *Idempotency {
	return &Idempotency{entries: map[string]*idemEntry{}, ttl: ttl, now: time.Now}
}

// Len returns number of cached entries.
func (i *Idempotency) Len() int {
	i.mu.Lock()
	defer i.mu.Unlock()
	return len(i.entries)
}

// Sweep removes expired entries.
func (i *Idempotency) Sweep() {
	i.mu.Lock()
	defer i.mu.Unlock()
	now := i.now()
	for k, e := range i.entries {
		if !e.inFlight && now.After(e.expires) {
			delete(i.entries, k)
		}
	}
}

type captureWriter struct {
	http.ResponseWriter
	status int
	buf    bytes.Buffer
}

func (c *captureWriter) WriteHeader(code int) {
	if c.status == 0 {
		c.status = code
	}
	c.ResponseWriter.WriteHeader(code)
}

func (c *captureWriter) Write(b []byte) (int, error) {
	if c.status == 0 {
		c.status = http.StatusOK
	}
	c.buf.Write(b)
	return c.ResponseWriter.Write(b)
}

// Wrap applies idempotency to a handler (only when the header is present on POST).
func (i *Idempotency) Wrap(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("X-Idempotency-Key")
		if key == "" || r.Method != http.MethodPost {
			next(w, r)
			return
		}
		if len(key) > 200 {
			WriteError(w, r, http.StatusBadRequest, "ERR_VALIDATION", "X-Idempotency-Key too long (max 200)", false)
			return
		}
		ck := key + "|" + r.Method + " " + r.URL.Path
		i.mu.Lock()
		if e, ok := i.entries[ck]; ok && (e.inFlight || i.now().Before(e.expires)) {
			if e.inFlight {
				i.mu.Unlock()
				WriteError(w, r, http.StatusConflict, "ERR_IDEMPOTENCY_IN_PROGRESS", "a request with this X-Idempotency-Key is still being processed", true)
				return
			}
			status, body, ct := e.status, e.body, e.contentType
			i.mu.Unlock()
			if ct != "" {
				w.Header().Set("Content-Type", ct)
			}
			w.Header().Set("Idempotent-Replay", "true")
			w.WriteHeader(status)
			_, _ = w.Write(body)
			return
		}
		i.entries[ck] = &idemEntry{inFlight: true}
		i.mu.Unlock()

		cw := &captureWriter{ResponseWriter: w}
		completed := false
		defer func() {
			i.mu.Lock()
			defer i.mu.Unlock()
			if !completed || cw.status >= 500 || cw.status == 0 {
				delete(i.entries, ck)
				return
			}
			i.entries[ck] = &idemEntry{status: cw.status, body: cw.buf.Bytes(), contentType: w.Header().Get("Content-Type"), expires: i.now().Add(i.ttl)}
		}()
		next(cw, r)
		completed = true
	}
}

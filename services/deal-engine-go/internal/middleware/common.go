package middleware

import (
	"bufio"
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/hrtime"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

// statusRecorder captures status for logging while preserving Flusher.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (s *statusRecorder) WriteHeader(code int) {
	if s.status == 0 {
		s.status = code
	}
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	n, err := s.ResponseWriter.Write(b)
	s.bytes += n
	return n, err
}

func (s *statusRecorder) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (s *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if h, ok := s.ResponseWriter.(http.Hijacker); ok {
		return h.Hijack()
	}
	return nil, nil, errors.New("hijack not supported")
}

// Unwrap supports http.ResponseController.
func (s *statusRecorder) Unwrap() http.ResponseWriter { return s.ResponseWriter }

// Logging assigns a trace id, recovers panics and emits one JSON log line per request.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := hrtime.Now()
		tid := r.Header.Get("X-Trace-Id")
		if tid == "" || len(tid) > 64 {
			tid = "tr_" + store.RandHex(5)
		}
		w.Header().Set("X-Trace-Id", tid)
		r = r.WithContext(context.WithValue(r.Context(), ctxTraceID, tid))
		rec := &statusRecorder{ResponseWriter: w}
		defer func() {
			if p := recover(); p != nil {
				slog.Error("panic", "trace_id", tid, "panic", p, "stack", string(debug.Stack()))
				if rec.status == 0 {
					WriteError(rec, r, http.StatusInternalServerError, "ERR_INTERNAL", "internal error", true)
				}
			}
			slog.Info("http", "trace_id", tid, "method", r.Method, "path", r.URL.Path,
				"status", rec.status, "bytes", rec.bytes, "dur_ms", float64(hrtime.Since(start).Microseconds())/1000,
				"replay", w.Header().Get("Idempotent-Replay") == "true")
		}()
		next.ServeHTTP(rec, r)
	})
}

// CORS allows the configured origins (exact match).
func CORS(origins []string) func(http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, o := range origins {
		allowed[strings.TrimRight(o, "/")] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && allowed[origin] {
				h := w.Header()
				h.Set("Access-Control-Allow-Origin", origin)
				h.Add("Vary", "Origin")
				h.Set("Access-Control-Allow-Credentials", "true")
				h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Idempotency-Key, X-Trace-Id, X-Samadhan-Signature")
				h.Set("Access-Control-Expose-Headers", "Idempotent-Replay, X-Trace-Id")
				h.Set("Access-Control-Max-Age", "600")
			}
			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

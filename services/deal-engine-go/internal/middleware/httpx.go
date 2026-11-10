// Package middleware provides HTTP middleware (CORS, logging/trace IDs, JWT
// auth + RBAC, idempotency) and the shared JSON/error envelope writers.
package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

type ctxKey int

const (
	ctxTraceID ctxKey = iota
	ctxClaims
)

// TraceID returns the request trace id.
func TraceID(ctx context.Context) string {
	if v, ok := ctx.Value(ctxTraceID).(string); ok {
		return v
	}
	return "tr_" + store.RandHex(5)
}

// WriteJSON writes v with status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

// ErrorBody is the contract §4 error envelope.
type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail is the inner error object.
type ErrorDetail struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	TraceID   string `json:"trace_id"`
	Retryable bool   `json:"retryable"`
}

// WriteError writes the standard error envelope.
func WriteError(w http.ResponseWriter, r *http.Request, status int, code, msg string, retryable bool) {
	WriteJSON(w, status, ErrorBody{Error: ErrorDetail{Code: code, Message: msg, TraceID: TraceID(r.Context()), Retryable: retryable}})
}

package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

// Claims carried in the mudra JWT.
type Claims struct {
	Sub       string `json:"sub"`  // internal user id
	NexconnID string `json:"nxid"` // nexconn user id
	Name      string `json:"name"`
	Role      string `json:"role"` // buyer | seller | arbitrator | guest
	Locale    string `json:"locale"`
	Issuer    string `json:"iss"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
}

// JWT issues and verifies HS256 tokens (hand-rolled, stdlib only).
type JWT struct {
	secret []byte
	ttl    time.Duration
}

// NewJWT creates a signer.
func NewJWT(secret string) *JWT { return &JWT{secret: []byte(secret), ttl: 24 * time.Hour} }

var b64 = base64.RawURLEncoding

const jwtHeader = `{"alg":"HS256","typ":"JWT"}`

// Errors.
var (
	ErrTokenMalformed = errors.New("malformed token")
	ErrTokenSignature = errors.New("bad token signature")
	ErrTokenExpired   = errors.New("token expired")
)

// Issue signs claims (sets iss/iat/exp).
func (j *JWT) Issue(c Claims) (string, error) {
	now := time.Now()
	c.Issuer = "mudra-deal-engine"
	c.IssuedAt = now.Unix()
	c.ExpiresAt = now.Add(j.ttl).Unix()
	payload, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	signing := b64.EncodeToString([]byte(jwtHeader)) + "." + b64.EncodeToString(payload)
	return signing + "." + b64.EncodeToString(j.mac(signing)), nil
}

func (j *JWT) mac(s string) []byte {
	m := hmac.New(sha256.New, j.secret)
	m.Write([]byte(s))
	return m.Sum(nil)
}

// Verify validates signature, alg and expiry.
func (j *JWT) Verify(tok string) (Claims, error) {
	parts := strings.Split(tok, ".")
	if len(parts) != 3 {
		return Claims{}, ErrTokenMalformed
	}
	hdrRaw, err := b64.DecodeString(parts[0])
	if err != nil {
		return Claims{}, ErrTokenMalformed
	}
	var hdr struct {
		Alg string `json:"alg"`
	}
	if json.Unmarshal(hdrRaw, &hdr) != nil || hdr.Alg != "HS256" {
		return Claims{}, ErrTokenMalformed
	}
	sig, err := b64.DecodeString(parts[2])
	if err != nil {
		return Claims{}, ErrTokenMalformed
	}
	if !hmac.Equal(sig, j.mac(parts[0]+"."+parts[1])) {
		return Claims{}, ErrTokenSignature
	}
	body, err := b64.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrTokenMalformed
	}
	var c Claims
	if err := json.Unmarshal(body, &c); err != nil {
		return Claims{}, ErrTokenMalformed
	}
	if c.ExpiresAt != 0 && time.Now().Unix() > c.ExpiresAt {
		return Claims{}, ErrTokenExpired
	}
	return c, nil
}

// ClaimsFrom returns the authenticated claims, if any.
func ClaimsFrom(ctx context.Context) (Claims, bool) {
	c, ok := ctx.Value(ctxClaims).(Claims)
	return c, ok
}

// WithClaims returns a context carrying claims (used by tests).
func WithClaims(ctx context.Context, c Claims) context.Context {
	return context.WithValue(ctx, ctxClaims, c)
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}

// RequireAuth enforces a valid JWT. If allowQuery, `?access_token=` is also
// accepted (EventSource cannot send headers). If roles is non-empty the
// token's role must be one of them (RBAC); finer ABAC checks live in handlers.
func (j *JWT) RequireAuth(allowQuery bool, roles ...string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			tok := bearer(r)
			if tok == "" && allowQuery {
				tok = r.URL.Query().Get("access_token")
			}
			if tok == "" {
				WriteError(w, r, http.StatusUnauthorized, "ERR_UNAUTHORIZED", "missing bearer token", false)
				return
			}
			c, err := j.Verify(tok)
			if err != nil {
				WriteError(w, r, http.StatusUnauthorized, "ERR_UNAUTHORIZED", "invalid token: "+err.Error(), false)
				return
			}
			if len(roles) > 0 {
				ok := false
				for _, role := range roles {
					if c.Role == role {
						ok = true
						break
					}
				}
				if !ok {
					WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "role '"+c.Role+"' not permitted; requires one of "+strings.Join(roles, ", "), false)
					return
				}
			}
			next(w, r.WithContext(WithClaims(r.Context(), c)))
		}
	}
}

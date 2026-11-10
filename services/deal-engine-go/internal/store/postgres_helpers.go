package store

import (
	"bytes"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
)

// Fixed UUIDv5 namespace seeds for deterministic string-ID <-> UUID mapping.
const (
	nsUser    = "samadhan:e01:user:"
	nsSession = "samadhan:e02:session:"
	nsDeal    = "samadhan:e03:deal:"
	nsEscrow  = "samadhan:e04:escrow:"
	nsMessage = "samadhan:e05:message:"
	nsAssay   = "samadhan:e06:assay:"
	nsDispute = "samadhan:e07:dispute:"
	nsVoucher = "samadhan:e08:voucher:"
	nsLot     = "samadhan:e09:lot:"
	nsArena   = "samadhan:e10:arena:"
)

// isCanonicalUUID checks whether s is a valid 36-char RFC 4122 hex UUID string.
func isCanonicalUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i := 0; i < 36; i++ {
		c := s[i]
		switch i {
		case 8, 13, 18, 23:
			if c != '-' {
				return false
			}
		default:
			isHex := (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')
			if !isHex {
				return false
			}
		}
	}
	return true
}

// DeterministicUUID derives a deterministic RFC 4122 v5 (SHA-1) UUID string from namespace + id.
func DeterministicUUID(ns, id string) string {
	trimmed := strings.TrimSpace(id)
	if isCanonicalUUID(trimmed) {
		return strings.ToLower(trimmed)
	}
	sum := sha1.Sum([]byte(ns + trimmed))
	var b [16]byte
	copy(b[:], sum[:16])
	b[6] = (b[6] & 0x0f) | 0x50 // version 5
	b[8] = (b[8] & 0x3f) | 0x80 // RFC 4122 variant
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// UserUUID maps a Go User.ID (e.g. "e01_7b91a2c0-1122-4455-8899-aabbccddeeff") to a PostgreSQL UUID.
func UserUUID(userID string) string {
	s := strings.TrimSpace(userID)
	if strings.HasPrefix(s, "e01_") {
		raw := strings.TrimPrefix(s, "e01_")
		if isCanonicalUUID(raw) {
			return strings.ToLower(raw)
		}
	}
	if isCanonicalUUID(s) {
		return strings.ToLower(s)
	}
	return DeterministicUUID(nsUser, s)
}

// FormatUserID formats a PostgreSQL users.id UUID back into the canonical Go "e01_<uuid>" string.
func FormatUserID(uuidStr string) string {
	u := strings.ToLower(strings.TrimSpace(uuidStr))
	if strings.HasPrefix(u, "e01_") {
		return u
	}
	return "e01_" + u
}

// DealUUID maps a Deal.ID (e.g. "d_8821_juki") to a deterministic PostgreSQL UUID.
func DealUUID(dealID string) string { return DeterministicUUID(nsDeal, dealID) }

// EscrowUUID maps a Deal.ID to its escrow_contracts.id UUID.
func EscrowUUID(dealID string) string { return DeterministicUUID(nsEscrow, dealID) }

// MessageUUID maps a ChatMessage.ID to a deterministic PostgreSQL UUID.
func MessageUUID(msgID string) string { return DeterministicUUID(nsMessage, msgID) }

// AssayUUID maps an AssayLog.ID to a deterministic PostgreSQL UUID.
func AssayUUID(assayID string) string { return DeterministicUUID(nsAssay, assayID) }

// DisputeUUID maps a Dispute.ID to a deterministic PostgreSQL UUID.
func DisputeUUID(disputeID string) string { return DeterministicUUID(nsDispute, disputeID) }

// VoucherUUID maps a Voucher.ID or curr hash to a deterministic PostgreSQL UUID.
func VoucherUUID(voucherKey string) string { return DeterministicUUID(nsVoucher, voucherKey) }

// LotUUID maps an OpenLot.LotID to a deterministic PostgreSQL UUID.
func LotUUID(lotID string) string { return DeterministicUUID(nsLot, lotID) }

// ArenaUUID maps an ArenaRun.ID to a deterministic PostgreSQL UUID.
func ArenaUUID(runID string) string { return DeterministicUUID(nsArena, runID) }

// sha256Hex computes hex(SHA-256(s)).
func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

var allowedDBLocales = map[string]bool{
	"ta-IN": true, "hi-IN": true, "mr-IN": true, "pa-IN": true,
	"ml-IN": true, "en-IN": true, "en-SG": true,
}

func normalizeLocale(loc string) string {
	if allowedDBLocales[loc] {
		return loc
	}
	return "en-IN"
}

func normalizeRole(role string) string {
	switch role {
	case "buyer", "seller", "arbitrator", "guest":
		return role
	default:
		return "guest"
	}
}

func normalizeKYCTier(tier string) string {
	switch tier {
	case "GUEST_SANDBOX", "PHONE_VERIFIED", "GSTIN_VERIFIED":
		return tier
	default:
		return "GUEST_SANDBOX"
	}
}

func normalizePlatform(p string) string {
	switch p {
	case "web", "mobile_expo", "sandbox_split":
		return p
	default:
		return "web"
	}
}

// unmarshalJSONUseNumber decodes JSONB bytes preserving exact integer precision (json.Number)
// so cryptographic ChainHash recomputation on voucher payloads never drifts on int64 values.
func unmarshalJSONUseNumber(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var out map[string]any
	if err := dec.Decode(&out); err != nil || out == nil {
		return map[string]any{}
	}
	return out
}

func marshalJSONOrEmptyObj(v any) []byte {
	if v == nil {
		return []byte("{}")
	}
	b, err := json.Marshal(v)
	if err != nil || len(b) == 0 || string(b) == "null" {
		return []byte("{}")
	}
	return b
}

func marshalJSONOrEmptyArr(v any) []byte {
	if v == nil {
		return []byte("[]")
	}
	b, err := json.Marshal(v)
	if err != nil || len(b) == 0 || string(b) == "null" {
		return []byte("[]")
	}
	return b
}

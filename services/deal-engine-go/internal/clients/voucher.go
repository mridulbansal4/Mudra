package clients

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
)

// GenesisHash is the prev hash of a deal's first voucher (64 zeros).
var GenesisHash = strings.Repeat("0", 64)

// CanonicalJSON marshals v with sorted object keys, no insignificant
// whitespace and no HTML escaping. Values are first round-tripped through
// map[string]any so struct field order never matters.
func CanonicalJSON(v any) ([]byte, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var generic any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&generic); err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(generic); err != nil { // maps encode with sorted keys
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

// ChainHash = SHA256(prev_hash_hex || deal_id || voucher_type || canonical_json(payload)).
func ChainHash(prevHashHex, dealID, voucherType string, payload any) (string, error) {
	cj, err := CanonicalJSON(payload)
	if err != nil {
		return "", err
	}
	h := sha256.New()
	h.Write([]byte(prevHashHex))
	h.Write([]byte(dealID))
	h.Write([]byte(voucherType))
	h.Write(cj)
	return hex.EncodeToString(h.Sum(nil)), nil
}

// SignedVoucher mirrors Rust POST /internal/sign-voucher plus the engine label.
type SignedVoucher struct {
	CurrHashHex  string `json:"curr_hash_hex"`
	SignatureHex string `json:"signature_hex"`
	PublicKeyHex string `json:"public_key_hex"`
	Engine       string `json:"engine"`
}

// GoSigner is the native Ed25519 voucher signer fallback.
type GoSigner struct {
	priv ed25519.PrivateKey
	pub  ed25519.PublicKey
}

// NewGoSigner builds a signer from a 32-byte seed.
func NewGoSigner(seed []byte) *GoSigner {
	priv := ed25519.NewKeyFromSeed(seed)
	return &GoSigner{priv: priv, pub: priv.Public().(ed25519.PublicKey)}
}

// PublicKeyHex returns the hex public key.
func (g *GoSigner) PublicKeyHex() string { return hex.EncodeToString(g.pub) }

// Sign computes the chain hash and signs the raw 32-byte digest.
func (g *GoSigner) Sign(dealID, voucherType string, payload any, prevHashHex string) (SignedVoucher, error) {
	curr, err := ChainHash(prevHashHex, dealID, voucherType, payload)
	if err != nil {
		return SignedVoucher{}, err
	}
	digest, _ := hex.DecodeString(curr)
	sig := ed25519.Sign(g.priv, digest)
	return SignedVoucher{CurrHashHex: curr, SignatureHex: hex.EncodeToString(sig), PublicKeyHex: g.PublicKeyHex(), Engine: EngineGoFallback}, nil
}

// VerifyVoucher checks a signature over the raw digest.
func VerifyVoucher(pubHex, currHashHex, sigHex string) bool {
	pub, err := hex.DecodeString(pubHex)
	if err != nil || len(pub) != ed25519.PublicKeySize {
		return false
	}
	digest, err := hex.DecodeString(currHashHex)
	if err != nil {
		return false
	}
	sig, err := hex.DecodeString(sigHex)
	if err != nil {
		return false
	}
	return ed25519.Verify(pub, digest, sig)
}

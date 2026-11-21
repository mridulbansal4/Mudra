//! Hash-chained, Ed25519-signed system vouchers (IMPLEMENTATION_CONTRACT.md §3).
//!
//! ```text
//! canonical_json(v) = JSON with object keys sorted lexicographically (by UTF-8
//!                     bytes) at every level, no whitespace, standard escaping
//!                     (serde_json: only `"` `\` and control chars are escaped;
//!                     non-ASCII is emitted as raw UTF-8; `<>&` are NOT escaped)
//! input      = prev_hash_hex + deal_id + voucher_type + canonical_json(payload)
//!              (plain UTF-8 string concatenation, no separators;
//!               prev_hash_hex = "" for the first voucher of a deal)
//! curr_hash  = SHA-256(input)                     -> 32 bytes, hex lowercase
//! signature  = Ed25519_sign(seed_key, curr_hash)  -> signs the 32 RAW bytes,
//!                                                    not the hex string
//! ```

use ed25519_dalek::{Signer, SigningKey};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

/// Dev-only default seed (also used by the Go fallback in dev).
pub const DEV_SEED_HEX: &str = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SignedVoucher {
    pub curr_hash_hex: String,
    pub signature_hex: String,
    pub public_key_hex: String,
}

pub struct VoucherSigner {
    key: SigningKey,
}

impl VoucherSigner {
    /// Builds a signer from a 32-byte Ed25519 seed given as 64 hex chars.
    pub fn from_seed_hex(seed_hex: &str) -> Result<Self, String> {
        let bytes =
            hex::decode(seed_hex.trim()).map_err(|e| format!("seed is not valid hex: {e}"))?;
        let seed: [u8; 32] = bytes
            .as_slice()
            .try_into()
            .map_err(|_| format!("seed must be 32 bytes, got {}", bytes.len()))?;
        Ok(Self {
            key: SigningKey::from_bytes(&seed),
        })
    }

    pub fn public_key_hex(&self) -> String {
        hex::encode(self.key.verifying_key().to_bytes())
    }

    pub fn sign(
        &self,
        prev_hash_hex: &str,
        deal_id: &str,
        voucher_type: &str,
        payload: &Value,
    ) -> SignedVoucher {
        let hash = chain_hash(prev_hash_hex, deal_id, voucher_type, payload);
        let signature = self.key.sign(&hash);
        SignedVoucher {
            curr_hash_hex: hex::encode(hash),
            signature_hex: hex::encode(signature.to_bytes()),
            public_key_hex: self.public_key_hex(),
        }
    }
}

/// SHA-256(prev_hash_hex || deal_id || voucher_type || canonical_json(payload)).
pub fn chain_hash(
    prev_hash_hex: &str,
    deal_id: &str,
    voucher_type: &str,
    payload: &Value,
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash_hex.as_bytes());
    hasher.update(deal_id.as_bytes());
    hasher.update(voucher_type.as_bytes());
    hasher.update(canonical_json(payload).as_bytes());
    hasher.finalize().into()
}

/// Canonical JSON: recursively sorted object keys, no whitespace.
pub fn canonical_json(value: &Value) -> String {
    let mut out = String::new();
    write_canonical(value, &mut out);
    out
}

fn write_canonical(value: &Value, out: &mut String) {
    match value {
        Value::Object(map) => {
            let mut entries: Vec<(&String, &Value)> = map.iter().collect();
            entries.sort_by(|a, b| a.0.as_bytes().cmp(b.0.as_bytes()));
            out.push('{');
            for (i, (k, v)) in entries.into_iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                out.push_str(&serde_json::to_string(k).expect("string serialization cannot fail"));
                out.push(':');
                write_canonical(v, out);
            }
            out.push('}');
        }
        Value::Array(items) => {
            out.push('[');
            for (i, v) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_canonical(v, out);
            }
            out.push(']');
        }
        scalar => {
            out.push_str(&serde_json::to_string(scalar).expect("scalar serialization cannot fail"));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};
    use serde_json::json;

    fn sample_payload() -> Value {
        json!({"z":1,"a":{"y":"ü\"x\n","b":[3,{"d":true,"c":null}]},"amount_paise":1850000,"state":"FUNDED"})
    }

    #[test]
    fn canonical_json_sorts_recursively() {
        assert_eq!(
            canonical_json(&sample_payload()),
            "{\"a\":{\"b\":[3,{\"c\":null,\"d\":true}],\"y\":\"ü\\\"x\\n\"},\"amount_paise\":1850000,\"state\":\"FUNDED\",\"z\":1}"
        );
        assert_eq!(canonical_json(&json!({})), "{}");
        assert_eq!(canonical_json(&Value::Null), "null");
        assert_eq!(canonical_json(&json!("<a&b>")), "\"<a&b>\"");
    }

    #[test]
    fn dev_public_key() {
        let s = VoucherSigner::from_seed_hex(DEV_SEED_HEX).unwrap();
        assert_eq!(
            s.public_key_hex(),
            "79b5562e8fe654f94078b112e8a98ba7901f853ae695bed7e0e3910bad049664"
        );
    }

    /// Cross-language vectors (computed with Node `crypto` using the same formula).
    #[test]
    fn chain_vectors_match_reference() {
        let s = VoucherSigner::from_seed_hex(DEV_SEED_HEX).unwrap();
        let v1 = s.sign("", "deal_001", "ESCROW_LOCKED", &sample_payload());
        assert_eq!(
            v1.curr_hash_hex,
            "6037d76a45a8fc1e15340218294d21084bdb707adc8c91bcff6587e353103f3d"
        );
        assert_eq!(
            v1.signature_hex,
            "ea9375fef05c138f79844464039ea3b291ee857c6bdcbcdacfb6888c8006cd9e1230942ebcdf2b610d2604e07b95e92c8a78d66c994696940d1bb40a9466840c"
        );
        let v2 = s.sign(&v1.curr_hash_hex, "deal_001", "ASSAY_STARTED", &json!({}));
        assert_eq!(
            v2.curr_hash_hex,
            "d268ef017a124904d1a43d8724464521a805e7febe4a4e041040c9387df25c86"
        );
        assert_eq!(
            v2.signature_hex,
            "7ee85a2973bba991b24cd2b495e118d998490e8fdc407a121c4151d499346d917ce5114a98cf058f2a47f9689ee1968ab863e1aeb3853e13c1593bd4d5863e00"
        );
    }

    #[test]
    fn signature_verifies() {
        let s = VoucherSigner::from_seed_hex(DEV_SEED_HEX).unwrap();
        let v = s.sign("abc", "deal_9", "FUNDS_RELEASED", &json!({"b":2,"a":1}));

        let pk_bytes: [u8; 32] = hex::decode(&v.public_key_hex).unwrap().try_into().unwrap();
        let vk = VerifyingKey::from_bytes(&pk_bytes).unwrap();
        let sig_bytes: [u8; 64] = hex::decode(&v.signature_hex).unwrap().try_into().unwrap();
        let sig = Signature::from_bytes(&sig_bytes);
        let hash = hex::decode(&v.curr_hash_hex).unwrap();
        assert!(vk.verify(&hash, &sig).is_ok());

        // Key order in the payload must not matter.
        let v_same = s.sign("abc", "deal_9", "FUNDS_RELEASED", &json!({"a":1,"b":2}));
        assert_eq!(v.curr_hash_hex, v_same.curr_hash_hex);

        // Tampering changes the hash and breaks verification.
        let other = chain_hash("abc", "deal_9", "FUNDS_RELEASED", &json!({"a":1,"b":3}));
        assert!(vk.verify(&other, &sig).is_err());
    }

    #[test]
    fn rejects_bad_seed() {
        assert!(VoucherSigner::from_seed_hex("abcd").is_err());
        assert!(VoucherSigner::from_seed_hex("zz").is_err());
    }
}

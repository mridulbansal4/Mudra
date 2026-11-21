//! Internal service-to-service HMAC authentication (IMPLEMENTATION_CONTRACT.md §5).
//!
//! When `INTERNAL_SERVICE_HMAC_SECRET` is set (non-empty), callers must send:
//!   X-Internal-Timestamp: <unix seconds>
//!   X-Internal-Signature: hex(HMAC_SHA256(secret, timestamp + "." + raw_body))
//! Requests with clock skew > 300 s or a bad signature get 401. The signature
//! comparison is constant-time (`Mac::verify_slice`). `/health` is exempt.

use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::{to_bytes, Body};
use axum::extract::{Request, State};
use axum::http::HeaderMap;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::error::AppError;
use crate::AppState;

type HmacSha256 = Hmac<Sha256>;

pub const HEADER_TIMESTAMP: &str = "x-internal-timestamp";
pub const HEADER_SIGNATURE: &str = "x-internal-signature";
pub const MAX_SKEW_SECS: i64 = 300;
pub const MAX_BODY_BYTES: usize = 16 * 1024 * 1024;

pub fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Computes `hex(HMAC_SHA256(secret, timestamp + "." + body))` (lowercase hex).
#[cfg_attr(not(test), allow(dead_code))]
pub fn sign(secret: &[u8], timestamp: &str, body: &[u8]) -> String {
    let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC accepts keys of any length");
    mac.update(timestamp.as_bytes());
    mac.update(b".");
    mac.update(body);
    hex::encode(mac.finalize().into_bytes())
}

/// Verifies the internal-auth headers against `body` at time `now` (unix seconds).
pub fn verify(
    secret: &[u8],
    headers: &HeaderMap,
    body: &[u8],
    now: i64,
) -> Result<(), &'static str> {
    let ts_str = headers
        .get(HEADER_TIMESTAMP)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim())
        .ok_or("missing X-Internal-Timestamp")?;
    let sig_str = headers
        .get(HEADER_SIGNATURE)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim())
        .ok_or("missing X-Internal-Signature")?;

    let ts: i64 = ts_str.parse().map_err(|_| "invalid X-Internal-Timestamp")?;
    if (now - ts).abs() > MAX_SKEW_SECS {
        return Err("timestamp skew exceeds 300 seconds");
    }

    let sig_bytes = hex::decode(sig_str).map_err(|_| "invalid X-Internal-Signature encoding")?;

    let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC accepts keys of any length");
    mac.update(ts_str.as_bytes());
    mac.update(b".");
    mac.update(body);
    // Constant-time comparison.
    mac.verify_slice(&sig_bytes).map_err(|_| "bad signature")
}

/// axum middleware (use with `middleware::from_fn_with_state`).
pub async fn hmac_auth(State(state): State<AppState>, req: Request, next: Next) -> Response {
    let secret = match state.hmac_secret.clone() {
        Some(s) => s,
        None => return next.run(req).await,
    };
    if req.uri().path() == "/health" {
        return next.run(req).await;
    }

    let (parts, body) = req.into_parts();
    let bytes = match to_bytes(body, MAX_BODY_BYTES).await {
        Ok(b) => b,
        Err(_) => return AppError::payload_too_large().into_response(),
    };

    if let Err(reason) = verify(secret.as_slice(), &parts.headers, &bytes, unix_now()) {
        tracing::warn!(path = %parts.uri.path(), reason, "internal auth rejected");
        return AppError::unauthorized(reason).into_response();
    }

    next.run(Request::from_parts(parts, Body::from(bytes)))
        .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    fn headers(ts: &str, sig: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(HEADER_TIMESTAMP, HeaderValue::from_str(ts).unwrap());
        h.insert(HEADER_SIGNATURE, HeaderValue::from_str(sig).unwrap());
        h
    }

    #[test]
    fn sign_matches_known_vector() {
        // HMAC_SHA256("key", "1700000000.{}") - computed with Node `crypto`.
        let s = sign(b"key", "1700000000", b"{}");
        assert_eq!(
            s,
            "9d713ed406bb7076d4123f0dc2c39d2df5c654ed4b0cd56b52c8b4c940bd63ae"
        );
    }

    #[test]
    fn accepts_valid_signature() {
        let body = br#"{"text":"hi"}"#;
        let now = 1_700_000_000;
        let ts = now.to_string();
        let sig = sign(b"secret", &ts, body);
        assert!(verify(b"secret", &headers(&ts, &sig), body, now).is_ok());
        // Within skew window.
        assert!(verify(b"secret", &headers(&ts, &sig), body, now + 299).is_ok());
    }

    #[test]
    fn rejects_skew_tampering_and_missing() {
        let body = b"{}";
        let now = 1_700_000_000;
        let ts = now.to_string();
        let sig = sign(b"secret", &ts, body);
        assert!(verify(b"secret", &headers(&ts, &sig), body, now + 301).is_err());
        assert!(verify(b"secret", &headers(&ts, &sig), body, now - 301).is_err());
        assert!(verify(b"secret", &headers(&ts, &sig), b"{ }", now).is_err());
        assert!(verify(b"other", &headers(&ts, &sig), body, now).is_err());
        assert!(verify(b"secret", &headers(&ts, "zz"), body, now).is_err());
        assert!(verify(b"secret", &HeaderMap::new(), body, now).is_err());
    }
}

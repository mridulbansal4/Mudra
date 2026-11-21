//! assay-verifier-rs - MUDRA-OS forensic & crypto engine (internal, :4003).
//!
//! Endpoints (IMPLEMENTATION_CONTRACT.md §6):
//!   GET  /health
//!   POST /internal/scrub-pii
//!   POST /internal/verify-assay
//!   POST /internal/phash-diff
//!   POST /internal/sign-voucher

mod audio_fft;
mod auth;
mod error;
mod phash;
mod scrubber;
mod voucher;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use axum::extract::rejection::JsonRejection;
use axum::extract::{DefaultBodyLimit, State};
use axum::routing::{get, post};
use axum::{middleware, Json, Router};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::AppError;
use crate::voucher::{SignedVoucher, VoucherSigner};

pub const SERVICE_NAME: &str = "assay-verifier-rs";
const DEFAULT_PORT: u16 = 4003;
const DEFAULT_SAMPLE_RATE: u32 = 48_000;

#[derive(Clone)]
pub struct AppState {
    /// `Some` only when `INTERNAL_SERVICE_HMAC_SECRET` is set and non-empty.
    pub hmac_secret: Option<Arc<Vec<u8>>>,
    pub signer: Arc<VoucherSigner>,
}

// ---------------------------------------------------------------- DTOs ----

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    public_key_hex: String,
}

#[derive(Deserialize)]
struct ScrubRequest {
    text: String,
}

#[derive(Deserialize, Default)]
struct VerifyAssayRequest {
    #[serde(default)]
    frame_jpeg_base64: Option<String>,
    #[serde(default)]
    reference_phash_hex: Option<String>,
    #[serde(default)]
    audio_pcm_f32_base64: Option<String>,
    #[serde(default)]
    sample_rate: Option<u32>,
    #[serde(default)]
    min_motor_rpm: Option<f64>,
}

#[derive(Serialize, Default, Debug)]
struct VerifyAssayResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    frame_phash_hex: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    hamming_distance: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    audio_fft_rpm_peak: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bearing_noise_ratio: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rpm_ok: Option<bool>,
    compute_ms: f64,
}

#[derive(Deserialize)]
struct PhashDiffRequest {
    a_hex: String,
    b_hex: String,
}

#[derive(Serialize)]
struct PhashDiffResponse {
    hamming_distance: u32,
}

#[derive(Deserialize)]
struct SignVoucherRequest {
    deal_id: String,
    voucher_type: String,
    #[serde(default)]
    payload: Value,
    #[serde(default)]
    prev_hash_hex: Option<String>,
}

// ------------------------------------------------------------ handlers ----

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: SERVICE_NAME,
        public_key_hex: state.signer.public_key_hex(),
    })
}

async fn scrub_pii(
    payload: Result<Json<ScrubRequest>, JsonRejection>,
) -> Result<Json<scrubber::ScrubResult>, AppError> {
    let Json(req) = payload?;
    Ok(Json(scrubber::scrub(&req.text)))
}

async fn verify_assay(
    payload: Result<Json<VerifyAssayRequest>, JsonRejection>,
) -> Result<Json<VerifyAssayResponse>, AppError> {
    let Json(req) = payload?;
    let resp = tokio::task::spawn_blocking(move || compute_assay(req))
        .await
        .map_err(|e| AppError::internal(format!("assay task failed: {e}")))??;
    Ok(Json(resp))
}

async fn phash_diff(
    payload: Result<Json<PhashDiffRequest>, JsonRejection>,
) -> Result<Json<PhashDiffResponse>, AppError> {
    let Json(req) = payload?;
    let d = phash::hamming(&req.a_hex, &req.b_hex).map_err(AppError::validation)?;
    Ok(Json(PhashDiffResponse { hamming_distance: d }))
}

async fn sign_voucher(
    State(state): State<AppState>,
    payload: Result<Json<SignVoucherRequest>, JsonRejection>,
) -> Result<Json<SignedVoucher>, AppError> {
    let Json(req) = payload?;
    if req.deal_id.trim().is_empty() || req.voucher_type.trim().is_empty() {
        return Err(AppError::validation("deal_id and voucher_type are required"));
    }
    let prev = req.prev_hash_hex.unwrap_or_default();
    Ok(Json(state.signer.sign(&prev, &req.deal_id, &req.voucher_type, &req.payload)))
}

// ------------------------------------------------------------- logic ------

/// Strips an optional `data:...;base64,` prefix and ASCII whitespace, then decodes.
fn decode_base64_field(name: &str, s: &str) -> Result<Vec<u8>, AppError> {
    let body = match s.find("base64,") {
        Some(idx) => &s[idx + "base64,".len()..],
        None => s,
    };
    let cleaned: String = body.chars().filter(|c| !c.is_ascii_whitespace()).collect();
    BASE64
        .decode(cleaned.as_bytes())
        .map_err(|e| AppError::validation(format!("{name} is not valid base64: {e}")))
}

fn compute_assay(req: VerifyAssayRequest) -> Result<VerifyAssayResponse, AppError> {
    let started = Instant::now();
    let has_frame = req.frame_jpeg_base64.as_deref().is_some_and(|s| !s.trim().is_empty());
    let has_audio = req.audio_pcm_f32_base64.as_deref().is_some_and(|s| !s.trim().is_empty());
    if !has_frame && !has_audio {
        return Err(AppError::validation(
            "provide frame_jpeg_base64 and/or audio_pcm_f32_base64",
        ));
    }

    let mut resp = VerifyAssayResponse::default();

    if has_frame {
        let raw = req.frame_jpeg_base64.as_deref().unwrap_or_default();
        let bytes = decode_base64_field("frame_jpeg_base64", raw)?;
        let hash = phash::phash_image_bytes(&bytes).map_err(AppError::validation)?;
        let hex = phash::to_hex(hash);
        if let Some(reference) = req.reference_phash_hex.as_deref() {
            if !reference.trim().is_empty() {
                let d = phash::hamming(&hex, reference).map_err(AppError::validation)?;
                resp.hamming_distance = Some(d);
            }
        }
        resp.frame_phash_hex = Some(hex);
    }

    if has_audio {
        let raw = req.audio_pcm_f32_base64.as_deref().unwrap_or_default();
        let bytes = decode_base64_field("audio_pcm_f32_base64", raw)?;
        let samples = audio_fft::decode_pcm_f32_le(&bytes);
        let sample_rate = req.sample_rate.unwrap_or(DEFAULT_SAMPLE_RATE);
        let analysis = audio_fft::analyze(&samples, sample_rate).map_err(AppError::validation)?;
        resp.audio_fft_rpm_peak = Some(round_to(analysis.rpm_peak, 2));
        resp.bearing_noise_ratio = Some(round_to(analysis.bearing_noise_ratio, 6));
        if let Some(min_rpm) = req.min_motor_rpm {
            resp.rpm_ok = Some(analysis.rpm_peak >= min_rpm);
        }
    }

    resp.compute_ms = round_to(started.elapsed().as_secs_f64() * 1000.0, 3);
    Ok(resp)
}

fn round_to(v: f64, decimals: i32) -> f64 {
    let f = 10f64.powi(decimals);
    (v * f).round() / f
}

// ------------------------------------------------------------- router -----

pub fn build_router(state: AppState) -> Router {
    let internal = Router::new()
        .route("/internal/scrub-pii", post(scrub_pii))
        .route("/internal/verify-assay", post(verify_assay))
        .route("/internal/phash-diff", post(phash_diff))
        .route("/internal/sign-voucher", post(sign_voucher))
        .layer(middleware::from_fn_with_state(state.clone(), auth::hmac_auth));

    Router::new()
        .route("/health", get(health))
        .merge(internal)
        .layer(DefaultBodyLimit::max(auth::MAX_BODY_BYTES))
        .with_state(state)
}

fn env_non_empty(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sig) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            sig.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let port: u16 = env_non_empty("RUST_ASSAY_VERIFIER_PORT")
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    let hmac_secret = env_non_empty("INTERNAL_SERVICE_HMAC_SECRET").map(|s| Arc::new(s.into_bytes()));

    let seed_hex = match env_non_empty("ASSAY_ED25519_PRIVATE_KEY_HEX") {
        Some(s) => s,
        None => {
            tracing::warn!("ASSAY_ED25519_PRIVATE_KEY_HEX not set; using the PUBLIC dev seed (never use in production)");
            voucher::DEV_SEED_HEX.to_string()
        }
    };
    let signer = match VoucherSigner::from_seed_hex(&seed_hex) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("invalid ASSAY_ED25519_PRIVATE_KEY_HEX: {e}");
            std::process::exit(1);
        }
    };

    let state = AppState {
        hmac_secret: hmac_secret.clone(),
        signer: Arc::new(signer),
    };
    tracing::info!(
        public_key_hex = %state.signer.public_key_hex(),
        hmac_enforced = hmac_secret.is_some(),
        "assay-verifier-rs starting"
    );

    let app = build_router(state);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("failed to bind {addr}: {e}");
            std::process::exit(1);
        }
    };
    tracing::info!("listening on http://{addr}");

    if let Err(e) = axum::serve(listener, app).with_graceful_shutdown(shutdown_signal()).await {
        tracing::error!("server error: {e}");
        std::process::exit(1);
    }
}

// --------------------------------------------------------------- tests ----

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::{to_bytes, Body};
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    fn state(secret: Option<&str>) -> AppState {
        AppState {
            hmac_secret: secret.map(|s| Arc::new(s.as_bytes().to_vec())),
            signer: Arc::new(VoucherSigner::from_seed_hex(voucher::DEV_SEED_HEX).unwrap()),
        }
    }

    async fn call(app: Router, req: Request<Body>) -> (StatusCode, Value) {
        let resp = app.oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = to_bytes(resp.into_body(), usize::MAX).await.unwrap();
        let v: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        (status, v)
    }

    fn post_json(uri: &str, body: &str) -> Request<Body> {
        Request::builder()
            .method("POST")
            .uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap()
    }

    #[tokio::test]
    async fn health_ok() {
        let app = build_router(state(Some("s3cret")));
        let req = Request::builder().uri("/health").body(Body::empty()).unwrap();
        let (status, v) = call(app, req).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(v["status"], "ok");
        assert_eq!(v["service"], SERVICE_NAME);
        assert_eq!(v["public_key_hex"].as_str().unwrap().len(), 64);
    }

    #[tokio::test]
    async fn scrub_without_secret() {
        let app = build_router(state(None));
        let (status, v) = call(app, post_json("/internal/scrub-pii", r#"{"text":"call 9876543210"}"#)).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(v["scrubbed_text"], "call [REDACTED_DPDP_PII]");
        assert_eq!(v["redacted_count"], 1);
        assert_eq!(v["categories"][0], "PHONE");
    }

    #[tokio::test]
    async fn hmac_enforced_when_secret_set() {
        let body = r#"{"a_hex":"ffffffffffffffff","b_hex":"0000000000000000"}"#;

        let app = build_router(state(Some("s3cret")));
        let (status, v) = call(app, post_json("/internal/phash-diff", body)).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(v["error"]["code"], "ERR_UNAUTHORIZED");

        let ts = auth::unix_now().to_string();
        let sig = auth::sign(b"s3cret", &ts, body.as_bytes());
        let mut req = post_json("/internal/phash-diff", body);
        req.headers_mut().insert(auth::HEADER_TIMESTAMP, ts.parse().unwrap());
        req.headers_mut().insert(auth::HEADER_SIGNATURE, sig.parse().unwrap());
        let app = build_router(state(Some("s3cret")));
        let (status, v) = call(app, req).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(v["hamming_distance"], 64);
    }

    #[tokio::test]
    async fn sign_voucher_endpoint() {
        let app = build_router(state(None));
        let body = r#"{"deal_id":"deal_001","voucher_type":"ASSAY_STARTED","payload":{},"prev_hash_hex":"6037d76a45a8fc1e15340218294d21084bdb707adc8c91bcff6587e353103f3d"}"#;
        let (status, v) = call(app, post_json("/internal/sign-voucher", body)).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(v["curr_hash_hex"], "d268ef017a124904d1a43d8724464521a805e7febe4a4e041040c9387df25c86");
        assert_eq!(v["public_key_hex"], "79b5562e8fe654f94078b112e8a98ba7901f853ae695bed7e0e3910bad049664");
    }

    #[tokio::test]
    async fn verify_assay_audio_and_validation() {
        // 1 s of 80.33 Hz at 48 kHz.
        let mut bytes = Vec::new();
        for i in 0..48_000 {
            let s = (2.0 * std::f64::consts::PI * 80.33 * i as f64 / 48_000.0).sin() as f32;
            bytes.extend_from_slice(&s.to_le_bytes());
        }
        let b64 = BASE64.encode(&bytes);
        let body = format!(r#"{{"audio_pcm_f32_base64":"{b64}","min_motor_rpm":4500}}"#);
        let app = build_router(state(None));
        let (status, v) = call(app, post_json("/internal/verify-assay", &body)).await;
        assert_eq!(status, StatusCode::OK);
        let rpm = v["audio_fft_rpm_peak"].as_f64().unwrap();
        assert!((rpm - 4819.8).abs() < 60.0, "rpm {rpm}");
        assert_eq!(v["rpm_ok"], true);
        assert!(v.get("frame_phash_hex").is_none());

        let app = build_router(state(None));
        let (status, v) = call(app, post_json("/internal/verify-assay", "{}")).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(v["error"]["code"], "ERR_VALIDATION");
    }

    #[test]
    fn base64_data_url_prefix_is_stripped() {
        let out = decode_base64_field("x", "data:image/png;base64,aGk=").unwrap();
        assert_eq!(out, b"hi");
        let out = decode_base64_field("x", "aG\nk=").unwrap();
        assert_eq!(out, b"hi");
    }
}

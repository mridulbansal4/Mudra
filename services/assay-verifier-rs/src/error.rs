//! Error envelope per IMPLEMENTATION_CONTRACT.md §4:
//! `{ "error": { "code", "message", "trace_id", "retryable" } }`

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

static TRACE_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Generates a process-unique trace id of the form `tr_<hex>`.
pub fn new_trace_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    let n = TRACE_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("tr_{:x}{:04x}", nanos, n & 0xffff)
}

#[derive(Debug)]
pub struct AppError {
    pub status: StatusCode,
    pub code: &'static str,
    pub message: String,
    pub retryable: bool,
}

impl AppError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            code: "ERR_VALIDATION",
            message: message.into(),
            retryable: false,
        }
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            code: "ERR_UNAUTHORIZED",
            message: message.into(),
            retryable: false,
        }
    }

    pub fn payload_too_large() -> Self {
        Self {
            status: StatusCode::PAYLOAD_TOO_LARGE,
            code: "ERR_PAYLOAD_TOO_LARGE",
            message: "request body too large".to_string(),
            retryable: false,
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            code: "ERR_INTERNAL",
            message: message.into(),
            retryable: true,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = json!({
            "error": {
                "code": self.code,
                "message": self.message,
                "trace_id": new_trace_id(),
                "retryable": self.retryable,
            }
        });
        (self.status, Json(body)).into_response()
    }
}

impl From<JsonRejection> for AppError {
    fn from(rejection: JsonRejection) -> Self {
        let status = rejection.status();
        let message = rejection.body_text();
        if status == StatusCode::PAYLOAD_TOO_LARGE {
            return AppError::payload_too_large();
        }
        AppError::validation(message)
    }
}

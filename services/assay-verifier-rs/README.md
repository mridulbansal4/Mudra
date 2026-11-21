# assay-verifier-rs (`:4003`)

Rust/axum forensic and crypto engine for MUDRA-OS. It is **optional**: when it can't be reached, `deal-engine-go` uses its native Go fallbacks, which use the same formulas (see below). See `docs/03-engineering/IMPLEMENTATION_CONTRACT.md` §5–§6.

> **Status:** this code has **not been compiled yet in the authoring environment**, because Rust wasn't installed there. Run `cargo test` first and fix anything it flags. The places most likely to need a tweak are listed at the end.

## Run / test

```bash
cd services/assay-verifier-rs
cargo test                      # unit + router tests
cargo run --release             # listens on 0.0.0.0:4003
docker build -t assay-verifier-rs . && docker run -p 4003:4003 assay-verifier-rs
```

| Env var | Default | Meaning |
|---|---|---|
| `RUST_ASSAY_VERIFIER_PORT` | `4003` | listen port |
| `INTERNAL_SERVICE_HMAC_SECRET` | unset | if set and non-empty, `/internal/*` requires HMAC headers (§5) |
| `ASSAY_ED25519_PRIVATE_KEY_HEX` | `0102…1f20` (public dev seed) | 32-byte Ed25519 seed, 64 hex chars |
| `RUST_LOG` | `info` | tracing filter |

## Endpoints

| Method / path | Request | Response |
|---|---|---|
| `GET /health` | – | `{status:"ok", service:"assay-verifier-rs", public_key_hex}` |
| `POST /internal/scrub-pii` | `{text}` | `{scrubbed_text, redacted_count, categories[], category_counts{}, scrub_time_us}` |
| `POST /internal/verify-assay` | `{frame_jpeg_base64?, reference_phash_hex?, audio_pcm_f32_base64?, sample_rate? (48000), min_motor_rpm?}` | `{frame_phash_hex?, hamming_distance?, audio_fft_rpm_peak?, bearing_noise_ratio?, rpm_ok?, compute_ms}` |
| `POST /internal/phash-diff` | `{a_hex, b_hex}` | `{hamming_distance}` |
| `POST /internal/sign-voucher` | `{deal_id, voucher_type, payload{}, prev_hash_hex}` | `{curr_hash_hex, signature_hex, public_key_hex}` |

Errors use the contract envelope: `{"error":{"code","message","trace_id","retryable"}}`. Codes are `ERR_VALIDATION` (400), `ERR_UNAUTHORIZED` (401), `ERR_PAYLOAD_TOO_LARGE` (413) and `ERR_INTERNAL` (500). The body limit is 16 MiB. `frame_jpeg_base64` may carry a `data:image/...;base64,` prefix. `verify-assay` returns 400 if it gets neither a frame nor audio.

### Internal auth

`X-Internal-Timestamp: <unix s>` and `X-Internal-Signature: hex(HMAC_SHA256(secret, ts + "." + raw_body))`. The signature is lowercase hex. Requests are rejected if the skew is more than 300 s. The comparison is constant-time. `/health` is exempt.
Test vector: secret `key`, ts `1700000000`, body `{}` → `9d713ed406bb7076d4123f0dc2c39d2df5c654ed4b0cd56b52c8b4c940bd63ae`.

## Cross-language formulas (Go and TS fallbacks MUST match)

### Voucher hash chain

```
canonical_json(v):
  object -> "{" + join(",", for k in sort_bytewise(keys): json_string(k) + ":" + canonical_json(v[k])) + "}"
  array  -> "[" + join(",", canonical_json(item)) + "]"
  scalar -> standard JSON (null/true/false/number/string)
  no whitespace anywhere.
  String escaping: only `"`, `\` and control chars (< 0x20) are escaped
  (\" \\ \n \r \t \b \f, others as \u00XX lowercase); non-ASCII is raw UTF-8;
  `<` `>` `&` are NOT escaped.

input     = prev_hash_hex + deal_id + voucher_type + canonical_json(payload)   // plain UTF-8 concatenation
            prev_hash_hex = ""  (empty string, NOT "GENESIS") for a deal's first voucher
curr_hash = SHA-256(input)                     -> curr_hash_hex = lowercase hex (64 chars)
signature = Ed25519.Sign(key, curr_hash_bytes) -> sign the 32 RAW hash bytes, not the hex text
            signature_hex = lowercase hex (128 chars); public_key_hex = 32-byte key, lowercase hex
```

Go notes:
- Use `json.Encoder` with `SetEscapeHTML(false)` (or a hand-written encoder). Go always escapes U+2028/U+2029, so keep those characters out of payloads.
- Use **integers and strings only** in payloads (amounts in paise). Float formatting differs between languages: Rust prints `1.0`, Go prints `1`.
- `ed25519.NewKeyFromSeed(seed)` gives the same key as `SigningKey::from_bytes(seed)`.

Vectors (dev seed `0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20`):

| | value |
|---|---|
| public key | `79b5562e8fe654f94078b112e8a98ba7901f853ae695bed7e0e3910bad049664` |
| payload | `{"z":1,"a":{"y":"ü\"x\n","b":[3,{"d":true,"c":null}]},"amount_paise":1850000,"state":"FUNDED"}` |
| canonical | `{"a":{"b":[3,{"c":null,"d":true}],"y":"ü\"x\n"},"amount_paise":1850000,"state":"FUNDED","z":1}` |
| v1 = (`""`, `deal_001`, `ESCROW_LOCKED`, payload) hash | `6037d76a45a8fc1e15340218294d21084bdb707adc8c91bcff6587e353103f3d` |
| v1 signature | `ea9375fef05c138f79844464039ea3b291ee857c6bdcbcdacfb6888c8006cd9e1230942ebcdf2b610d2604e07b95e92c8a78d66c994696940d1bb40a9466840c` |
| v2 = (v1 hash, `deal_001`, `ASSAY_STARTED`, `{}`) hash | `d268ef017a124904d1a43d8724464521a805e7febe4a4e041040c9387df25c86` |

### pHash (64-bit DCT)

1. Decode the image to RGBA8. Luma = `0.299R + 0.587G + 0.114B` as f64; alpha is ignored.
2. Box-resize to 32×32. Output cell `(ox,oy)` averages source `x ∈ [⌊ox·w/32⌋, max(⌊(ox+1)·w/32⌋, x0+1))`, and the same for y (integer division).
3. `F[u][v] = a(u)a(v) Σ_y Σ_x g[y][x]·cos((2y+1)uπ/64)·cos((2x+1)vπ/64)` for u,v ∈ 0..8, with `a(0)=√(1/32)` and `a(k)=√(2/32)`.
4. `median` = element index 31 of the 63 AC coefficients (DC excluded), sorted ascending.
5. For `i = u·8+v` (DC included): if `F > median + 1e-9`, set bit `63-i`. Output 16 lowercase hex chars.
6. Hamming distance = `popcount(a ^ b)`.

Vectors (test image `R=(4x)%256, G=(5y)%256, B=(x·y)%256, A=255`): 64×48 → `80031f3f3e787971`, 20×10 → `8055005580550055`.

### Audio FFT

The input is mono little-endian f32. The signal is cut into non-overlapping 4096-sample frames (at most 64; a shorter signal is zero-padded into one frame). Each frame gets a Hann window `0.5-0.5cos(2πn/(N-1))`, and the power spectra are averaged.
- RPM: take the peak bin in 20–500 Hz, refine it with parabolic interpolation on `ln(power)`, then `rpm = hz·60`. A synthetic 80.33 Hz sine at 48 kHz gives about 4812 RPM (bins are 11.7 Hz wide).
- Bearing noise ratio = power in 4–8 kHz ÷ power in bins 1..N/2.

## PII scrubber

The scrubber runs these passes in order, each over the previous output: EMAIL, UPI (`name@handle`), AADHAAR (12 digits starting 2–9, optional space or hyphen every 4 digits, **Verhoeff-validated**), PHONE (`[6-9]` + 9 digits, optional `+91`/`0` prefix, optional separator after the 5th digit), PAN and IFSC. Every match becomes `[REDACTED_DPDP_PII]`. Only ASCII digits count, so Devanagari and Tamil numerals and text are left alone.

## Least-certain spots (check first after installing Rust)

- `error.rs`: `JsonRejection::status()` / `body_text()` (axum 0.7 API).
- `phash.rs` test `png_roundtrip_matches_rgba`: `DynamicImage::write_to(&mut Cursor, ImageFormat::Png)` (image 0.25 signature).
- `main.rs` tests: `tower::ServiceExt::oneshot` on `Router` (dev-dep tower 0.5).
- Thresholding is tie-safe: bit = `F[i] > median + 1e-9` (`PHASH_TIE_EPSILON`), so coefficients that are mathematically equal to the median (flat or upscaled frames) never flip on float noise. Rust, WASM, Go (`internal/clients/fallback_phash.go`) and TS (`apps/web/src/lib/assay.ts`) all pin the vectors above in tests.

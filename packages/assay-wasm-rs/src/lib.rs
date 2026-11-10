//! assay-wasm-rs — browser-side assay helpers for SAMADHAN-OS.
//!
//! Runs inside `apps/web/src/workers/assay-wasm.worker.ts` on frames pulled
//! from an `OffscreenCanvas` (`ImageData.data` is RGBA8, row-major).
//!
//! Exports (wasm-bindgen):
//! * `laplacian_variance(rgba, width, height) -> f64` — blur/focus metric.
//! * `phash_rgba(rgba, width, height) -> String` — 64-bit DCT pHash, 16 hex chars.
//!   Bit-for-bit the same algorithm as `services/assay-verifier-rs/src/phash.rs`.
//! * `hamming_hex(a, b) -> u32` — Hamming distance of two 16-hex-char hashes.
//!
//! Error convention (JS cannot easily catch Rust errors here): invalid input
//! returns `0.0` / `""` / `64` respectively.

/// Coefficients mathematically equal to the median must not flip bits on float noise (shared with Go/TS).
pub const PHASH_TIE_EPSILON: f64 = 1e-9;

use std::f64::consts::PI;

use wasm_bindgen::prelude::*;

const N: usize = 32;
const K: usize = 8;

/// Returns the number of bytes needed for `width x height` RGBA8, or None on overflow.
fn rgba_len(width: u32, height: u32) -> Option<usize> {
    (width as usize).checked_mul(height as usize)?.checked_mul(4)
}

#[inline]
fn luma(rgba: &[u8], i: usize) -> f64 {
    0.299 * rgba[i] as f64 + 0.587 * rgba[i + 1] as f64 + 0.114 * rgba[i + 2] as f64
}

/// Variance of the 4-neighbour Laplacian `[0 1 0; 1 -4 1; 0 1 0]` over the
/// interior pixels of the luma image (`0.299R + 0.587G + 0.114B`), population
/// variance (divide by count). Higher = sharper. Returns 0.0 for images
/// smaller than 3x3 or a too-short buffer.
pub fn laplacian_variance_impl(rgba: &[u8], width: u32, height: u32) -> f64 {
    let w = width as usize;
    let h = height as usize;
    if w < 3 || h < 3 {
        return 0.0;
    }
    match rgba_len(width, height) {
        Some(n) if rgba.len() >= n => {}
        _ => return 0.0,
    }

    let gray: Vec<f64> = (0..w * h).map(|p| luma(rgba, p * 4)).collect();

    let count = ((w - 2) * (h - 2)) as f64;
    let mut lap = Vec::with_capacity((w - 2) * (h - 2));
    let mut sum = 0f64;
    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let c = gray[y * w + x];
            let v = gray[(y - 1) * w + x] + gray[(y + 1) * w + x] + gray[y * w + x - 1] + gray[y * w + x + 1]
                - 4.0 * c;
            sum += v;
            lap.push(v);
        }
    }
    let mean = sum / count;
    let mut var = 0f64;
    for v in &lap {
        let d = v - mean;
        var += d * d;
    }
    var / count
}

/// 64-bit DCT pHash from raw RGBA8 (see crate README for the exact algorithm).
pub fn phash_rgba_u64(rgba: &[u8], width: u32, height: u32) -> Option<u64> {
    let w = width as usize;
    let h = height as usize;
    if w == 0 || h == 0 {
        return None;
    }
    let needed = rgba_len(width, height)?;
    if rgba.len() < needed {
        return None;
    }

    // Luma + box resize to 32x32.
    let mut g = [0f64; N * N];
    for oy in 0..N {
        let y0 = oy * h / N;
        let y1 = ((oy + 1) * h / N).max(y0 + 1);
        for ox in 0..N {
            let x0 = ox * w / N;
            let x1 = ((ox + 1) * w / N).max(x0 + 1);
            let mut sum = 0f64;
            let mut count = 0f64;
            for y in y0..y1 {
                for x in x0..x1 {
                    sum += luma(rgba, (y * w + x) * 4);
                    count += 1.0;
                }
            }
            g[oy * N + ox] = sum / count;
        }
    }

    // cos[k][n] = cos((2n+1)*k*pi/64)
    let mut cos_t = [[0f64; N]; K];
    for (k, row) in cos_t.iter_mut().enumerate() {
        for (n, c) in row.iter_mut().enumerate() {
            *c = (((2 * n + 1) * k) as f64 * PI / (2.0 * N as f64)).cos();
        }
    }
    let alpha = |k: usize| -> f64 {
        if k == 0 {
            (1.0 / N as f64).sqrt()
        } else {
            (2.0 / N as f64).sqrt()
        }
    };

    let mut coeffs = [0f64; K * K];
    for u in 0..K {
        for v in 0..K {
            let mut s = 0f64;
            for y in 0..N {
                for x in 0..N {
                    s += g[y * N + x] * cos_t[u][y] * cos_t[v][x];
                }
            }
            coeffs[u * K + v] = alpha(u) * alpha(v) * s;
        }
    }

    let mut ac: Vec<f64> = coeffs[1..].to_vec();
    ac.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median = ac[31];

    let mut hash: u64 = 0;
    for (i, &c) in coeffs.iter().enumerate() {
        if c > median + PHASH_TIE_EPSILON {
            hash |= 1u64 << (63 - i);
        }
    }
    Some(hash)
}

/// Parses a 16-hex-char hash (optional `0x`, case-insensitive).
pub fn parse_hash_hex(s: &str) -> Option<u64> {
    let t = s.trim();
    let t = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")).unwrap_or(t);
    if t.len() != 16 || !t.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    u64::from_str_radix(t, 16).ok()
}

// ------------------------------------------------------ wasm exports -------

#[wasm_bindgen]
pub fn laplacian_variance(rgba: &[u8], width: u32, height: u32) -> f64 {
    laplacian_variance_impl(rgba, width, height)
}

#[wasm_bindgen]
pub fn phash_rgba(rgba: &[u8], width: u32, height: u32) -> String {
    match phash_rgba_u64(rgba, width, height) {
        Some(h) => format!("{:016x}", h),
        None => String::new(),
    }
}

#[wasm_bindgen]
pub fn hamming_hex(a: &str, b: &str) -> u32 {
    match (parse_hash_hex(a), parse_hash_hex(b)) {
        (Some(x), Some(y)) => (x ^ y).count_ones(),
        _ => 64,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_image(w: u32, h: u32, brighten: u8) -> Vec<u8> {
        let mut v = Vec::with_capacity((w * h * 4) as usize);
        for y in 0..h {
            for x in 0..w {
                v.push((((x * 4) % 256) as u8).saturating_add(brighten));
                v.push((((y * 5) % 256) as u8).saturating_add(brighten));
                v.push((((x * y) % 256) as u8).saturating_add(brighten));
                v.push(255);
            }
        }
        v
    }

    /// Box-blur the RGB channels (3x3) to simulate a defocused frame.
    fn blur(src: &[u8], w: usize, h: usize) -> Vec<u8> {
        let mut out = src.to_vec();
        for y in 1..h - 1 {
            for x in 1..w - 1 {
                for ch in 0..3 {
                    let mut s = 0u32;
                    for dy in 0..3 {
                        for dx in 0..3 {
                            s += src[((y + dy - 1) * w + (x + dx - 1)) * 4 + ch] as u32;
                        }
                    }
                    out[(y * w + x) * 4 + ch] = (s / 9) as u8;
                }
            }
        }
        out
    }

    #[test]
    fn phash_cross_language_vectors() {
        // Same vectors as services/assay-verifier-rs/src/phash.rs.
        assert_eq!(phash_rgba(&test_image(64, 48, 0), 64, 48), "80031f3f3e787971");
        assert_eq!(phash_rgba(&test_image(20, 10, 0), 20, 10), "8055005580550055");
    }

    #[test]
    fn phash_identical_and_brightened() {
        let a = phash_rgba(&test_image(64, 48, 0), 64, 48);
        let b = phash_rgba(&test_image(64, 48, 0), 64, 48);
        let c = phash_rgba(&test_image(64, 48, 8), 64, 48);
        assert_eq!(hamming_hex(&a, &b), 0);
        assert!(hamming_hex(&a, &c) <= 8);
    }

    #[test]
    fn phash_invalid_input() {
        assert_eq!(phash_rgba(&[0u8; 8], 4, 4), "");
        assert_eq!(phash_rgba(&[], 0, 0), "");
    }

    #[test]
    fn hamming_cases() {
        assert_eq!(hamming_hex("ffffffffffffffff", "0000000000000000"), 64);
        assert_eq!(hamming_hex("000000000000000F", "0x0000000000000000"), 4);
        assert_eq!(hamming_hex("bad", "0000000000000000"), 64);
    }

    #[test]
    fn laplacian_reference_vector() {
        let v = laplacian_variance(&test_image(64, 48, 0), 64, 48);
        assert!((v - 565.0015694848249).abs() < 1e-6, "got {v}");
    }

    #[test]
    fn laplacian_flat_is_zero_and_blur_lowers_it() {
        let flat = vec![128u8; 16 * 16 * 4];
        assert!(laplacian_variance(&flat, 16, 16) < 1e-9);

        let sharp = test_image(64, 48, 0);
        let soft = blur(&sharp, 64, 48);
        assert!(laplacian_variance(&soft, 64, 48) < laplacian_variance(&sharp, 64, 48));

        assert_eq!(laplacian_variance(&[0u8; 4], 1, 1), 0.0);
        assert_eq!(laplacian_variance(&[0u8; 10], 8, 8), 0.0);
    }
}

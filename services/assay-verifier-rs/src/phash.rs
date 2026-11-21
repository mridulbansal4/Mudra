//! 64-bit DCT perceptual hash (pHash).
//!
//! Algorithm (identical in `packages/assay-wasm-rs`, the Go fallback and the
//! TS fallback - see README "pHash algorithm"):
//!   1. Decode JPEG/PNG -> RGBA8 (alpha ignored).
//!   2. Luma per pixel: `0.299*R + 0.587*G + 0.114*B` (f64).
//!   3. Box-resize to 32x32: output cell (ox, oy) averages source pixels
//!      x in [floor(ox*w/32), max(floor((ox+1)*w/32), x0+1)), same for y.
//!   4. Orthonormal 2D DCT-II, only the 8x8 lowest frequencies are needed:
//!      F[u][v] = a(u)*a(v) * sum_y sum_x g[y][x] * cos((2y+1)u*pi/64) * cos((2x+1)v*pi/64)
//!      a(0) = sqrt(1/32), a(k>0) = sqrt(2/32). u = vertical freq (row), v = horizontal.
//!   5. median = element 31 of the 63 AC coefficients (F[0][0] excluded) sorted ascending.
//!   6. For i = u*8+v in 0..64 (DC included): bit = F > median; bit i is placed at
//!      position (63 - i), i.e. F[0][0] is the most significant bit.
//!   7. Hex: 16 lowercase hex chars, zero padded.

/// Coefficients mathematically equal to the median must not flip bits on float noise (shared with Go/TS).
pub const PHASH_TIE_EPSILON: f64 = 1e-9;

use std::f64::consts::PI;

const N: usize = 32;
const K: usize = 8;

/// Computes the pHash from raw RGBA8 pixels (row-major, 4 bytes per pixel).
pub fn phash_rgba(rgba: &[u8], width: u32, height: u32) -> Result<u64, String> {
    let w = width as usize;
    let h = height as usize;
    if w == 0 || h == 0 {
        return Err("image has zero width or height".to_string());
    }
    let needed = w
        .checked_mul(h)
        .and_then(|p| p.checked_mul(4))
        .ok_or_else(|| "image dimensions overflow".to_string())?;
    if rgba.len() < needed {
        return Err(format!("rgba buffer too small: {} < {}", rgba.len(), needed));
    }

    // Steps 2+3: luma + box resize to 32x32.
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
                    let i = (y * w + x) * 4;
                    sum += 0.299 * rgba[i] as f64 + 0.587 * rgba[i + 1] as f64 + 0.114 * rgba[i + 2] as f64;
                    count += 1.0;
                }
            }
            g[oy * N + ox] = sum / count;
        }
    }

    // Step 4: cosine table cos[k][n] = cos((2n+1)*k*pi/64).
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

    // Step 5: median of AC coefficients.
    let mut ac: Vec<f64> = coeffs[1..].to_vec();
    ac.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median = ac[31];

    // Step 6.
    let mut hash: u64 = 0;
    for (i, &c) in coeffs.iter().enumerate() {
        if c > median + PHASH_TIE_EPSILON {
            hash |= 1u64 << (63 - i);
        }
    }
    Ok(hash)
}

/// Decodes JPEG/PNG bytes and computes the pHash.
pub fn phash_image_bytes(bytes: &[u8]) -> Result<u64, String> {
    let img = image::load_from_memory(bytes).map_err(|e| format!("image decode failed: {e}"))?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    phash_rgba(rgba.as_raw(), w, h)
}

pub fn to_hex(hash: u64) -> String {
    format!("{:016x}", hash)
}

/// Parses a 16-hex-char pHash (optional `0x` prefix, case-insensitive).
pub fn parse_hex(s: &str) -> Result<u64, String> {
    let t = s.trim();
    let t = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")).unwrap_or(t);
    if t.len() != 16 || !t.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(format!("invalid pHash hex (need 16 hex chars): {s:?}"));
    }
    u64::from_str_radix(t, 16).map_err(|e| format!("invalid pHash hex: {e}"))
}

/// Hamming distance between two 16-hex-char pHashes.
pub fn hamming(a_hex: &str, b_hex: &str) -> Result<u32, String> {
    Ok((parse_hex(a_hex)? ^ parse_hex(b_hex)?).count_ones())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_image(w: u32, h: u32, brighten: u8) -> Vec<u8> {
        let mut v = Vec::with_capacity((w * h * 4) as usize);
        for y in 0..h {
            for x in 0..w {
                let r = ((x * 4) % 256) as u8;
                let g = ((y * 5) % 256) as u8;
                let b = ((x * y) % 256) as u8;
                v.push(r.saturating_add(brighten));
                v.push(g.saturating_add(brighten));
                v.push(b.saturating_add(brighten));
                v.push(255);
            }
        }
        v
    }

    #[test]
    fn identical_images_distance_zero() {
        let img = test_image(64, 48, 0);
        let a = to_hex(phash_rgba(&img, 64, 48).unwrap());
        let b = to_hex(phash_rgba(&img, 64, 48).unwrap());
        assert_eq!(a.len(), 16);
        assert_eq!(hamming(&a, &b).unwrap(), 0);
    }

    #[test]
    fn brightened_image_small_distance() {
        let a = phash_rgba(&test_image(64, 48, 0), 64, 48).unwrap();
        let b = phash_rgba(&test_image(64, 48, 8), 64, 48).unwrap();
        assert!((a ^ b).count_ones() <= 8, "distance {}", (a ^ b).count_ones());
    }

    #[test]
    fn different_images_large_distance() {
        let a = phash_rgba(&test_image(64, 48, 0), 64, 48).unwrap();
        // Transposed-ish pattern.
        let mut other = Vec::new();
        for y in 0..48u32 {
            for x in 0..64u32 {
                let v = if (x / 8 + y / 8) % 2 == 0 { 230u8 } else { 20u8 };
                other.extend_from_slice(&[v, v, v, 255]);
            }
        }
        let b = phash_rgba(&other, 64, 48).unwrap();
        assert!((a ^ b).count_ones() > 10);
    }

    /// Cross-language vectors computed with the reference JS implementation
    /// of the README algorithm (Go/TS fallbacks must produce the same).
    #[test]
    fn cross_language_vectors() {
        assert_eq!(to_hex(phash_rgba(&test_image(64, 48, 0), 64, 48).unwrap()), "80031f3f3e787971");
        assert_eq!(to_hex(phash_rgba(&test_image(20, 10, 0), 20, 10).unwrap()), "8055005580550055");
    }

    #[test]
    fn png_roundtrip_matches_rgba() {
        let raw = test_image(64, 48, 0);
        let img = image::RgbaImage::from_raw(64, 48, raw.clone()).unwrap();
        let mut buf: Vec<u8> = Vec::new();
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Png)
            .unwrap();
        let from_png = phash_image_bytes(&buf).unwrap();
        assert_eq!(from_png, phash_rgba(&raw, 64, 48).unwrap());
    }

    #[test]
    fn hamming_parsing() {
        assert_eq!(hamming("ffffffffffffffff", "0000000000000000").unwrap(), 64);
        assert_eq!(hamming("0x000000000000000F", "0000000000000000").unwrap(), 4);
        assert!(hamming("abc", "0000000000000000").is_err());
        assert!(hamming("zzzzzzzzzzzzzzzz", "0000000000000000").is_err());
    }

    #[test]
    fn rejects_bad_buffers() {
        assert!(phash_rgba(&[0u8; 10], 4, 4).is_err());
        assert!(phash_rgba(&[], 0, 0).is_err());
    }
}

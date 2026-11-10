//! 4096-point Hann-windowed FFT motor assay.
//!
//! Input: little-endian f32 mono PCM. The signal is split into consecutive
//! non-overlapping 4096-sample frames (max 64 frames; a shorter signal is
//! zero-padded into one frame); each frame is Hann-windowed
//! (`w[n] = 0.5 - 0.5*cos(2*pi*n/(N-1))`) and the power spectra are averaged.
//!
//! * Motor RPM: strongest bin with frequency in [20, 500] Hz, refined with
//!   parabolic interpolation on ln(power) (very accurate for a Hann window),
//!   `rpm = hz * 60`.
//! * Bearing noise ratio: power in [4000, 8000] Hz / total power (bins 1..=N/2).

use rustfft::num_complex::Complex;
use rustfft::FftPlanner;

pub const FFT_SIZE: usize = 4096;
pub const MAX_FRAMES: usize = 64;
pub const RPM_BAND_HZ: (f64, f64) = (20.0, 500.0);
pub const BEARING_BAND_HZ: (f64, f64) = (4000.0, 8000.0);

#[derive(Debug, Clone, Copy, PartialEq)]
#[allow(dead_code)]
pub struct AudioAnalysis {
    pub peak_hz: f64,
    pub rpm_peak: f64,
    pub bearing_noise_ratio: f64,
}

/// Decodes little-endian f32 samples (trailing partial sample ignored).
pub fn decode_pcm_f32_le(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
        .collect()
}

pub fn analyze(samples: &[f32], sample_rate: u32) -> Result<AudioAnalysis, String> {
    if !(8_000..=384_000).contains(&sample_rate) {
        return Err(format!("unsupported sample_rate {sample_rate} (8000..=384000)"));
    }
    if samples.is_empty() {
        return Err("no audio samples".to_string());
    }

    let n = FFT_SIZE;
    let half = n / 2;
    let frames = (samples.len() / n).clamp(1, MAX_FRAMES);

    let window: Vec<f64> = (0..n)
        .map(|i| 0.5 - 0.5 * (2.0 * std::f64::consts::PI * i as f64 / (n as f64 - 1.0)).cos())
        .collect();

    let mut planner = FftPlanner::<f64>::new();
    let fft = planner.plan_fft_forward(n);

    let mut power = vec![0f64; half + 1];
    let mut buf: Vec<Complex<f64>> = vec![Complex::new(0.0, 0.0); n];
    for f in 0..frames {
        let offset = f * n;
        for (i, slot) in buf.iter_mut().enumerate() {
            let s = samples.get(offset + i).copied().unwrap_or(0.0);
            let s = if s.is_finite() { s as f64 } else { 0.0 };
            *slot = Complex::new(s * window[i], 0.0);
        }
        fft.process(&mut buf);
        for (k, p) in power.iter_mut().enumerate() {
            *p += buf[k].norm_sqr();
        }
    }
    for p in power.iter_mut() {
        *p /= frames as f64;
    }

    let bin_hz = sample_rate as f64 / n as f64;

    // Dominant peak in the RPM band.
    let lo = ((RPM_BAND_HZ.0 / bin_hz).ceil() as usize).max(1);
    let hi = ((RPM_BAND_HZ.1 / bin_hz).floor() as usize).min(half - 1);
    if lo > hi {
        return Err("RPM band empty for this sample rate".to_string());
    }
    let mut best = lo;
    for k in lo..=hi {
        if power[k] > power[best] {
            best = k;
        }
    }

    let (peak_hz, rpm_peak) = if power[best] <= 1e-20 {
        (0.0, 0.0)
    } else {
        let eps = 1e-30;
        let a = (power[best - 1] + eps).ln();
        let b = (power[best] + eps).ln();
        let c = (power[best + 1] + eps).ln();
        let denom = a - 2.0 * b + c;
        let delta = if denom.abs() > 1e-12 {
            (0.5 * (a - c) / denom).clamp(-0.5, 0.5)
        } else {
            0.0
        };
        let hz = (best as f64 + delta) * bin_hz;
        (hz, hz * 60.0)
    };

    // Bearing noise ratio.
    let mut total = 0f64;
    let mut band = 0f64;
    for (k, &p) in power.iter().enumerate().skip(1) {
        total += p;
        let hz = k as f64 * bin_hz;
        if hz >= BEARING_BAND_HZ.0 && hz <= BEARING_BAND_HZ.1 {
            band += p;
        }
    }
    let bearing_noise_ratio = if total > 0.0 { band / total } else { 0.0 };

    Ok(AudioAnalysis {
        peak_hz,
        rpm_peak,
        bearing_noise_ratio,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sine(freq: f64, amp: f64, sr: u32, secs: f64) -> Vec<f32> {
        let len = (sr as f64 * secs) as usize;
        (0..len)
            .map(|i| (amp * (2.0 * std::f64::consts::PI * freq * i as f64 / sr as f64).sin()) as f32)
            .collect()
    }

    #[test]
    fn detects_4820_rpm_motor() {
        let s = sine(80.33, 0.8, 48_000, 2.0);
        let r = analyze(&s, 48_000).unwrap();
        // Bin width is 48000/4096 = 11.72 Hz (703 RPM); log-parabolic
        // interpolation lands within ~0.2 Hz (~12 RPM). Allow 60 RPM.
        assert!((r.rpm_peak - 4819.8).abs() < 60.0, "rpm {}", r.rpm_peak);
        assert!(r.bearing_noise_ratio < 0.01, "ratio {}", r.bearing_noise_ratio);
    }

    #[test]
    fn bearing_noise_ratio_detects_high_band_energy() {
        let motor = sine(80.33, 1.0, 48_000, 2.0);
        let rattle = sine(6000.0, 0.5, 48_000, 2.0);
        let mixed: Vec<f32> = motor.iter().zip(rattle.iter()).map(|(a, b)| a + b).collect();
        let r = analyze(&mixed, 48_000).unwrap();
        // Expected power ratio 0.25 / 1.25 = 0.2.
        assert!(r.bearing_noise_ratio > 0.15 && r.bearing_noise_ratio < 0.25, "ratio {}", r.bearing_noise_ratio);
        assert!((r.rpm_peak - 4819.8).abs() < 60.0);
    }

    #[test]
    fn decodes_le_f32() {
        let vals = [0.5f32, -1.25, 3.0];
        let mut bytes = Vec::new();
        for v in vals {
            bytes.extend_from_slice(&v.to_le_bytes());
        }
        bytes.push(7); // trailing partial sample ignored
        assert_eq!(decode_pcm_f32_le(&bytes), vals.to_vec());
    }

    #[test]
    fn silence_and_bad_input() {
        let r = analyze(&vec![0.0f32; 8192], 48_000).unwrap();
        assert_eq!(r.rpm_peak, 0.0);
        assert_eq!(r.bearing_noise_ratio, 0.0);
        assert!(analyze(&[], 48_000).is_err());
        assert!(analyze(&[0.0; 10], 100).is_err());
    }

    #[test]
    fn short_signal_is_zero_padded() {
        let s = sine(120.0, 1.0, 48_000, 0.05); // 2400 samples < 4096
        let r = analyze(&s, 48_000).unwrap();
        assert!((r.peak_hz - 120.0).abs() < 12.0, "hz {}", r.peak_hz);
    }
}

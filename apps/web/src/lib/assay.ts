/**
 * Browser side of the video assay (F-05):
 *  - FF_SIMULATED_HD_CAMERA: a canvas-rendered inspection scene of the Juki serial plate + motor audio,
 *    so the demo works on machines without a webcam.
 *  - Pure-TS fallbacks of the Rust/WASM metrics (Laplacian sharpness, 64-bit DCT pHash).
 *    `packages/assay-wasm-rs` implements the same algorithms in Rust for wasm32.
 */

export const DEMO_SERIAL = "JUKI-MO-6814S-8821";
export const DEMO_RPM = 4820;

export function drawSimulatedFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const sway = Math.sin(t / 900) * 6;
  const tilt = Math.sin(t / 1300) * 0.015;
  // workshop backdrop
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#3b3a36");
  g.addColorStop(1, "#1d1c1a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // bench
  ctx.fillStyle = "#5a4630";
  ctx.fillRect(0, h * 0.78, w, h * 0.22);

  ctx.save();
  ctx.translate(w / 2 + sway, h * 0.48);
  ctx.rotate(tilt);
  // machine body
  ctx.fillStyle = "#e9e6dd";
  roundRect(ctx, -w * 0.34, -h * 0.3, w * 0.68, h * 0.56, 18);
  ctx.fill();
  ctx.fillStyle = "#cfcabd";
  roundRect(ctx, w * 0.16, -h * 0.36, w * 0.14, h * 0.2, 10);
  ctx.fill();
  // spinning hand wheel (motion cue)
  ctx.save();
  ctx.translate(w * 0.27, h * 0.02);
  ctx.rotate((t / 1000) * ((DEMO_RPM / 60) * 0.02) * Math.PI * 2);
  ctx.strokeStyle = "#7d786c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, h * 0.09, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(h * 0.09, 0);
    ctx.stroke();
  }
  ctx.restore();
  // serial plate
  ctx.fillStyle = "#b9b4a6";
  roundRect(ctx, -w * 0.27, -h * 0.06, w * 0.38, h * 0.16, 6);
  ctx.fill();
  ctx.strokeStyle = "#8b8678";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#1e1d1a";
  ctx.font = `600 ${Math.round(h * 0.05)}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText(DEMO_SERIAL, -w * 0.255, h * 0.0);
  ctx.font = `500 ${Math.round(h * 0.03)}px "JetBrains Mono", monospace`;
  ctx.fillText("SERVO 550W · 220V · MADE 2023", -w * 0.255, h * 0.06);
  ctx.restore();

  // sensor grain so pHash isn't trivially constant
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let i = 0; i < 120; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface CapturedFrame {
  jpegBase64: string;
  dataUrl: string;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}

export function captureFrame(source: CanvasImageSource, width = 480, height = 360): CapturedFrame {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, width, height);
  const dataUrl = c.toDataURL("image/jpeg", 0.82);
  return {
    dataUrl,
    jpegBase64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    rgba: ctx.getImageData(0, 0, width, height).data,
    width,
    height,
  };
}

function toGray(rgba: Uint8ClampedArray, w: number, h: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  return g;
}

/** Variance of the 3x3 Laplacian - higher is sharper. Same metric as assay-wasm-rs::laplacian_variance. */
export function laplacianVariance(rgba: Uint8ClampedArray, w: number, h: number): number {
  const g = toGray(rgba, w, h);
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** 64-bit DCT perceptual hash (32x32 → DCT-II → 8x8 low band → median threshold). */
export function phashRgba(rgba: Uint8ClampedArray, w: number, h: number): string {
  const g = toGray(rgba, w, h);
  const N = 32;
  const small = new Float64Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // box sample
      const x0 = Math.floor((x * w) / N);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / N));
      const y0 = Math.floor((y * h) / N);
      const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / N));
      let s = 0;
      let c = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        s += g[yy * w + xx];
        c++;
      }
      small[y * N + x] = s / c;
    }
  }
  const coeffs: number[] = [];
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      let s = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          s += small[y * N + x] * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N)) * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
        }
      }
      const au = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
      const av = v === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
      coeffs.push(au * av * s);
    }
  }
  // Matches services/assay-verifier-rs: median = element 31 of the 63 sorted AC coefficients.
  const median = coeffs.slice(1).sort((a, b) => a - b)[31];
  let hex = "";
  for (let nib = 0; nib < 16; nib++) {
    let val = 0;
    for (let b = 0; b < 4; b++) val = (val << 1) | (coeffs[nib * 4 + b] > median + 1e-9 ? 1 : 0);
    hex += val.toString(16);
  }
  return hex;
}

export function hammingHex(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Synthetic motor audio: fundamental at rpm/60 Hz + harmonics + light noise, as little-endian f32 base64. */
export function synthMotorPcmBase64(rpm = DEMO_RPM, samples = 8192, sampleRate = 48000): string {
  const f = rpm / 60;
  const buf = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    buf[i] =
      0.6 * Math.sin(2 * Math.PI * f * t) +
      0.18 * Math.sin(2 * Math.PI * 2 * f * t) +
      0.07 * Math.sin(2 * Math.PI * 3 * f * t) +
      0.02 * (Math.random() * 2 - 1);
  }
  return f32ToBase64(buf);
}

export function f32ToBase64(buf: Float32Array): string {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Grab ~170 ms of microphone PCM from a live stream (real-camera mode). */
export async function captureMicPcmBase64(stream: MediaStream): Promise<{ base64: string; sampleRate: number } | null> {
  if (!stream.getAudioTracks().length) return null;
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 8192;
  src.connect(analyser);
  await new Promise((r) => setTimeout(r, 250));
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  const sampleRate = ctx.sampleRate;
  await ctx.close();
  return { base64: f32ToBase64(buf), sampleRate };
}

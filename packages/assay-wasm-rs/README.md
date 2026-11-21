# @mudra/assay-wasm-rs

Rust → WebAssembly helpers used by `apps/web` in `assay-wasm.worker.ts` during video inspections. The worker runs on `OffscreenCanvas` frames, where `ImageData.data` is RGBA8.

> **Status:** this code has **not been compiled yet in the authoring environment**, because Rust wasn't installed there. Run `cargo test` first.

| Export | Returns | Notes |
|---|---|---|
| `laplacian_variance(rgba: Uint8Array, width, height)` | `number` | Variance of the 4-neighbour Laplacian on luma `0.299R+0.587G+0.114B`, over interior pixels (population variance). Higher means sharper. Returns `0` for input smaller than 3×3 or a short buffer. |
| `phash_rgba(rgba, width, height)` | `string` | 64-bit DCT pHash as 16 lowercase hex chars. The algorithm is identical to `services/assay-verifier-rs` (32×32 box resize → orthonormal DCT-II → 8×8 → median of the 63 AC values → bit `63-i`). Returns `""` on invalid input. |
| `hamming_hex(a, b)` | `number` | `popcount(a ^ b)`. Returns `64` if either input isn't 16 hex chars. |

The exact algorithm and test vectors are in `services/assay-verifier-rs/README.md`. Test image vectors: 64×48 → `80031f3f3e787971`, 20×10 → `8055005580550055`, Laplacian variance (64×48) → `565.0015694848249`.

## Build / test

```bash
cd packages/assay-wasm-rs
cargo test                       # native unit tests of the pure functions
npm run build:wasm               # wasm-pack build --target web --out-dir pkg
```

You need `rustup target add wasm32-unknown-unknown` and `cargo install wasm-pack`.

Usage from the worker:

```ts
import init, { laplacian_variance, phash_rgba, hamming_hex } from '@mudra/assay-wasm-rs';
await init();
const img = ctx.getImageData(0, 0, w, h);
const blur = laplacian_variance(new Uint8Array(img.data.buffer), w, h);
const hash = phash_rgba(new Uint8Array(img.data.buffer), w, h);
```

## Fallback

Per the degraded-mode rule (contract §2), the web app ships a **pure-TypeScript fallback with identical algorithms**. The demo therefore works when `pkg/` hasn't been built, or when the WASM fails to load. Both implementations must produce the vectors above.

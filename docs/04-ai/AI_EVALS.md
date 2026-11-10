# AI Evaluation Suite & Red-Team Benchmarks — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (AI Evals Lead — Hamel Husain & Percy Liang Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Models](./MODELS.md) · [Prompts](./PROMPTS.md) · [CI/CD](../05-ops/CICD.md)

---

## 1. Evaluation Philosophy: No Vibes, Only Golden Datasets

Following Hamel Husain's AI evaluation methodology, every prompt or model change in `ai/prompts/` is tested against a deterministic **Golden Evaluation Dataset (`ai/evals/datasets/`)** in CI (`.github/workflows/ai-evals.yml`) before merge.

---

## 2. Golden Evaluation Datasets (`ai/evals/datasets/`)

| Dataset File | Size | Source & Labeling Methodology | Target Model |
|---|---|---|---|
| `bilingual_deals_indic_v1.jsonl` | `120` pairs | Real domain utterances from Tirupur textile buyers (`ta-IN`), Ludhiana machinery sellers (`hi-IN`, `pa-IN`), Pune electronics traders (`mr-IN`), and Kochi spice buyers (`ml-IN`), human-verified by native speakers with ground-truth JSON contract terms (`amount_paise`, `required_assay_rpm`, `warranty_months`). | `M-01` & `M-02` |
| `video_assay_frames_v1.jsonl` | `60` cases | 40 genuine industrial machine / laptop / GPU serial-plate frames + 20 adversarial spoof frames (blurred frames, angled screen-replay photos, mismatched serial stickers, cracked cast-iron mounts). | `M-03` + Rust `assay-verifier-rs` |
| `frozen_tribunal_disputes_v1.jsonl` | `40` cases | Historical B2B/P2P dispute scenarios (transit bracket crack, DOA electronics, partial accessory missing, buyer remorse with zero defect, seller non-shipment) paired with expert human arbitrator (`P-04`) basis-point splits. | `M-04` |
| `adversarial_redteam_injections_v1.jsonl` | `50` attacks | Multilingual prompt injections (Tamil/Hindi/English), fake `[SYS-VOUCHER]` strings, Aadhaar/phone leakage probes, and `/arena` price-floor jailbreaks. | `M-01`..`M-05` + Rust PII Scrubber |

---

## 3. Task-Specific Metrics, Baselines & Acceptance Thresholds

| Task & Model | Primary Metric | Baseline (Zero-Shot Unconstrained LLM) | SAMADHAN-OS Current Score | Hard CI Gate Threshold |
|---|---|---|---|---|
| **`M-01` Cross-Lingual Translation Quality** | `chrF++` + Technical Term Preservation Rate (`Juki MO-6814S`, `4800 RPM`) | `81.4%` term preservation | **`99.2%`** | `>= 97.0%` |
| **`M-01` Contract Term JSON Extraction** | Exact-Match `amount_paise` (in integer paise) & `warranty_months` F1 | `84.0%` (fails on `"1.45 Lakh"` / `"पेटी"`) | **`98.8%`** | `>= 96.5%` |
| **Rust Pre-Flight DPDP PII Redaction** | PII Recall on Aadhaar / PAN / Phone / UPI (`scrubber.rs`) | `0%` (raw passthrough) | **`100.0%` (`184 µs` median)** | **`100.0%` (`< 300 µs`)** |
| **`M-03` + Rust Video Assay Verification** | True Positive Defect Detection / Screen-Replay Rejection Rate | `72.5%` (Vision alone) | **`96.7%` (Rust `pHash`/FFT + Vision)** | `>= 94.0%` |
| **`M-04` Tribunal Settlement Calibration** | Mean Absolute Deviation (MAD) from Human Arbitrator Split (`bps`) | `± 1,850 bps` (`18.5%`) | **`± 320 bps` (`3.2%`)** | `<= 500 bps` (`5.0%`) |
| **Red-Team Prompt Injection Resistance** | Unauthorized Escrow State / Price Floor Mutation Rate | `18.0%` jailbreak success | **`0.0%` (Go FSM + XML sandbox)** | **`0.0%` (Zero Tolerance)** |

---

## 4. Automated CI Regression Pipeline (`.github/workflows/ai-evals.yml`)

Every pull request modifying `ai/prompts/**`, `services/nexconn-bridge-node/**`, or `services/assay-verifier-rs/**` runs:
```bash
# 1. Run Rust deterministic PII scrubber & pHash/FFT evals
cd services/assay-verifier-rs && cargo test --release --test eval_suite

# 2. Run JSON schema, Indic translation, Tribunal calibration & Red-Team evals
pnpm --filter @samadhan/ai-evals run eval:ci
```
If any metric drops below the **Hard CI Gate Threshold** in Section 3, the GitHub Actions workflow blocks the merge and prints a diff table showing the exact failing JSONL row.

---

## 5. Human-in-the-Loop (HITL) Review & Continuous Calibration Loop

1. **Bilateral User Confirmation on `M-01`**: Extracted contract terms (`₹1,45,000`, `4,800 RPM`) never auto-debit a user; they populate `<nc-escrow-deal-card>` in `DRAFT` state requiring explicit human click on `Lock Escrow`.
2. **Arbitrator Override on `M-04` (`/dispatch`)**: When a channel is frozen via `addGroupChannelFreezeList`, Arbitrator Meera (`P-04`) sees `M-04`'s streamed split proposal alongside the raw pre/post `pHash` and call logs. Any adjustment Meera makes (e.g., changing `12%` rebate to `15%`) is logged back into `frozen_tribunal_disputes_v1.jsonl` as a new gold-standard training example.

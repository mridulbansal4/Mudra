# Security Policy - MUDRA-OS (`SamvadDeal`)

MUDRA-OS handles live milestone escrow state machines (`services/deal-engine-go`), cryptographic product inspection proofs (`services/assay-verifier-rs`), and privileged `@nexconn/server-sdk` channel moderation (`services/nexconn-bridge-node`). Security and **DPDP Act 2023** privacy are foundational engineering requirements.

For our deep-dive security documentation, consult:
- **[`docs/06-security-compliance/SECURITY_ARCHITECTURE.md`](docs/06-security-compliance/SECURITY_ARCHITECTURE.md)** (Defense-in-depth zones, mTLS/HMAC internal service auth, Ed25519 signing)
- **[`docs/06-security-compliance/THREAT_MODEL.md`](docs/06-security-compliance/THREAT_MODEL.md)** (STRIDE + OWASP Top 10 + LLM Top 10 threat matrix)
- **[`docs/06-security-compliance/PRIVACY.md`](docs/06-security-compliance/PRIVACY.md)** (Rust `< 300µs` Aho-Corasick DPDP PII scrubber & data retention)

---

## 1. Supported Versions

| Version | Branch / Tag | Supported | Notes |
| :--- | :--- | :--- | :--- |
| `0.1.x` | `main` (`v0.1.0`) | Yes | Active Nexconn Build Challenge 2026 release (`PS-03 Marketplace & Support`). |
| `< 0.1.0` | Pre-release prototypes | No | Superseded by the polyglot Go 1.24 + Rust 1.85 + Node 22 architecture. |

---

## 2. Non-Negotiable Security Invariants

1. **Zero Client Exposure of `NEXCONN_SECRET_KEY`**:
   - `NEXCONN_SECRET_KEY` exists exclusively in the server environment of `services/nexconn-bridge-node` (`:4001`). A CI gate (`scripts/check-client-bundle-secrets.mjs`) scans `apps/web/dist` on every PR and fails the build if any server secret or `/v4/auth/access-token/issue` credential is bundled.
2. **Optimistic Concurrency & Idempotency on Escrow Transitions**:
   - Every escrow state mutation (`API-06`) in `services/deal-engine-go` (`:4002`) requires both a DragonflyDB / Redis 7.4 `Idempotency-Key` (`24h` TTL) and a PostgreSQL 17 `expected_version` (`UPDATE escrow_contracts SET version = version + 1 WHERE id = $1 AND version = $2`), preventing double-spend and replay attacks.
3. **HMAC-SHA256 Webhook Verification**:
   - All payment/escrow webhooks (`POST /api/v1/webhooks/upi-ondc`, `API-17`) verify `X-Mudra-Signature` (`HMAC-SHA256(timestamp + "." + raw_body, UPI_WEBHOOK_HMAC_SECRET)`) using constant-time `hmac.Equal` and reject timestamps older than `±300 seconds`.
4. **Rust Pre-LLM DPDP PII Scrubbing (`< 300µs`)**:
   - All user text and ASR transcripts pass through `POST /internal/scrub-pii` (`services/assay-verifier-rs`) to redact Aadhaar (`12 digits` + Verhoeff checksum), PAN, UPI VPA, IFSC, and bank account numbers before any external call to Gemini (`M-01`, `M-03`, `M-04`, `M-05`) or Bhashini (`M-02`).

---

## 3. Reporting a Vulnerability

Please **do not** open a public GitHub issue for suspected security vulnerabilities (such as escrow state bypasses, webhook signature flaws, PII scrubber evasions, or Nexconn token privilege escalation).

1. **Contact**: Report privately via GitHub Security Advisories (`Security -> Report a vulnerability`) or email the Team `Chanakya` Security Lead (`Atharva Satav`, see [`docs/08-project/TEAM.md`](docs/08-project/TEAM.md)).
2. **Include**:
   - Affected service (`services/deal-engine-go`, `services/assay-verifier-rs`, `services/nexconn-bridge-node`, `apps/web`, or `packages/nc-lit-cards`).
   - Reproduction steps or proof-of-concept request payload.
   - Impact assessment (e.g., unauthorized escrow state transition, cross-channel message spoofing, PII leak).
3. **Response SLA**:
   - **Acknowledgment**: Within **4 hours**.
   - **Triage & Mitigation Plan**: Within **12 hours**.
   - **Patch & Verification**: Within **24 hours** for `Critical`/`High` severity issues.

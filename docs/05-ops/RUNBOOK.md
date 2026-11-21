# Operations Runbook, Incident Playbooks & Demo Emergency Plan - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (SRE & Incident Command Lead) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Observability](./OBSERVABILITY.md) · [Deployment](./DEPLOYMENT.md) · [Security Architecture](../06-security-compliance/SECURITY_ARCHITECTURE.md)

---

## 1. Incident Severity Levels & Response SLAs

| Severity | Definition | Response SLA | Escalation Owner |
|---|---|---|---|
| **SEV-1 (P0 Critical)** | Live App URL unreachable, `API-01`/`API-02` failing to issue Nexconn tokens, or security/PII breach. | `< 5 minutes` (Auto-alert during Nov 23–27 judging) | Dev 1 (Nexconn) + Dev 2 (Go/Rust) |
| **SEV-2 (P1 High)** | `@nexconn/call` WebRTC video failing to connect or Gemini 2.5 Flash returning `503`/`429`. | `< 15 minutes` (Automatic runtime fallback triggers in `<2.5s`) | Dev 3 (Web) + Dev 4 (AI) |
| **SEV-3 (P2 Moderate)** | Elevated latency (`p95 > 800ms`) on `/traction` or `Open` flash-lot ticker delay. | `< 2 hours` | On-Call Engineer |

---

## 2. Playbooks for the Top 10 Failure Scenarios

| # | Failure Scenario | Detection Signal | Automated / Manual Recovery Playbook |
|---|---|---|---|
| **1** | **`NCCallEngine` fails to start audio/video call** | Client event `ERR_NC_CALL_NOT_CONNECTED` | Verify `nexconn-boot.ts` awaited `await NCEngine.connect({ token })` before calling `NCCallEngine.getInstance()`. Trigger auto-reconnect barrier. |
| **2** | **Judge/User has no webcam or denies camera permission** | `NotAllowedError` / `NotFoundError` on `getUserMedia` | Automatic fallback activates `FF_SIMULATED_HD_CAMERA=true`, feeding the 60fps HTML5 Canvas Juki Overlock / MacBook stream into `NCCallEngine` and Rust WASM. |
| **3** | **Symmetric NAT / Firewall blocks WebRTC UDP media** | ICE connection state remains `checking` `> 2,500ms` | Client switches to **Rust WASM Keyframe Burst Mode** over `NCEngine` → `API-08`, completing `pHash` + Vision verification without dropping the deal. |
| **4** | **Gemini 2.5 Flash API rate limit (`429`) or outage (`503`)** | Node Bridge circuit breaker trips after `1,800ms` | Node Bridge (`services/nexconn-bridge-node`) routes `M-01`/`M-02` to **Bhashini ULCA** / **Together AI**, or streams deterministic pre-cached Tamil/Hindi demo chunks in `/sandbox`. |
| **5** | **Lit custom card (`<nc-escrow-deal-card>`) renders raw JSON** | Missing custom element registration before `app.ready()` | Ensure `registerMessageType` executes synchronously inside `NCChatUIApplication.initialize({ hooks: { beforeReady() } })`. |
| **6** | **`Open` or `Community` channel fails inside `<nc-chat-ui-app-provider>`** | Chat UI throws unsupported channel type | Route `Direct`/`Group`/`System` to `<nc-chat-ui-app-provider>` and route `Open`/`Community` to the `NCEngine` HeroUI v3 sidebar (`ADR-0002`). |
| **7** | **Concurrent click race condition on `Lock` / `Release` / `Dispute`** | HTTP `409 Conflict` (`ERR_FSM_CONFLICT`) from Go `:4002` | Client React Query invalidates `API-04` and re-renders `<nc-escrow-deal-card>` with the authoritative PostgreSQL `version` and `fsm_state`. |
| **8** | **Mid-stream interruption during `sendGroupChannelStreamMessage`** | Stream watchdog timer (`3,000ms`) expires in Node Bridge | Node Bridge flushes partial translation buffer + JSON footer and marks bubble complete so no message stays stuck in streaming state. |
| **9** | **PostgreSQL connection pool exhaustion under flash-lot spike** | `pgxpool` acquired connections `> 85%` | DragonflyDB/Redis absorbs read traffic for `API-12` (`open-lots`) and `API-18` (`traction`) via 2-second TTL cache. |
| **10**| **`Open` channel spam raid during live demo** | `> 10 msgs/sec` from unverified user | `OpenChannelPriorityControlsApi` (`API-13`) restricts broadcast visibility to priority-whitelisted sellers; `ModerationApi` mutes abusive `userId`. |

---

## 3. CERT-In 6-Hour Reporting & India DPDP Act 2023 Breach Procedure

In the event of a confirmed security incident or personal data breach:
1. **Minute 0–15 (Containment)**: Rotate `NEXCONN_SECRET_KEY`, `JWT_SIGNING_KEY`, and `DATABASE_URL` credentials in AWS Secrets Manager / Railway; freeze affected channels via `addGroupChannelFreezeList`.
2. **Hour 0–6 (CERT-In Statutory Notification)**: Per **CERT-In Directions of April 28, 2022**, submit structured incident report to `incident@cert-in.org.in` within **6 hours** of detection containing NTP-synchronized timestamps (`IST`), attack vector, and affected infrastructure logs.
3. **DPDP Act 2023 & Singapore PDPA Notification**: Dispatch an immediate bilingual breach notice to affected users' read-only `System` channel via `SystemMessagesApi` and notify the **Data Protection Board of India** (and Singapore **PDPC** if Singaporean records are affected within 72 hours).

---

## 4. Disaster Recovery (RPO / RTO) & Demo-Day Emergency Plan

- **Recovery Point Objective (RPO)**: **`0 seconds`** for committed escrow transactions (PostgreSQL 17 synchronous WAL + Nexconn cloud `System` channel voucher replication).
- **Recovery Time Objective (RTO)**: **`< 90 seconds`** (stateless Go, Rust, and Node containers restart in `<1.5s`; automated standby failover in `<90s`).
- **Demo-Day Emergency Plan**:
  1. Primary Live URL: `https://mudra-os.dev` (Vercel + Railway/AWS Mumbai).
  2. Warm Standby URL: `https://backup.mudra-os.dev` (Cloudflare Pages + Singapore container replica).
  3. Offline Local Docker Bundle: Pre-warmed on two developer laptops over separate 5G hotspots (`Jio 5G` + `Airtel 5G`).

# Service-Level Agreement (SLA) for B2B Merchants & Marketplaces - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Operations & Enterprise SLA Lead - Tim Cook & Louis Litt Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Performance](../03-engineering/PERFORMANCE.md) · [Runbook](./RUNBOOK.md) · [Business Model](../07-business/BUSINESS_MODEL.md)

---

## 1. Scope of Enterprise & Merchant SLA

This Service-Level Agreement governs B2B merchants (`P-02`), ONDC Buyer/Seller Network Participants, and marketplace operators subscribing to the **MUDRA-OS Pro Merchant (`₹2,499/mo`)** and **Enterprise Trade Desk** tiers.

---

## 2. Quantitative Service-Level Commitments

| SLA Metric | Commitment Target | Measurement Source | Service Credit Remedy if Breached |
|---|---|---|---|
| **Platform & Deal Desk Availability** | **`>= 99.95%` monthly uptime** | Synthetic 60s probe on `API-01`, `API-04`, and `NCEngine` socket | `10%` monthly fee credit per `0.1%` below `99.95%` (up to `100%`) |
| **Escrow State Transition Latency (`API-06`)** | **`p99 < 15 ms`** (API gateway round-trip; `<1.2ms` in Go engine) | OpenTelemetry histogram `mudra_go_fsm_transition_duration` | `10%` credit if monthly p99 exceeds `50ms` |
| **Dispute Channel Freeze Execution (`API-09`)** | **`p99 < 250 ms`** (`addGroupChannelFreezeList`) | Nexconn v4 Server SDK response telemetry | `100%` waiver of per-deal `0.8%` escrow fee on affected deal |
| **AI + Human Tribunal First Response (`/dispatch`)** | **`< 90 seconds` (AI Stream) / `< 15 minutes` (Human Arbitrator `P-04`)** | Timestamp delta (`dispute_cases.frozen_at` to `resolved_at`) | `100%` waiver of per-deal `0.8%` escrow fee on affected deal |
| **Cryptographic Audit Voucher Durability (`E-08`)** | **`99.9999999%` (`9 nines`)** | PostgreSQL 17 WAL + Nexconn `System` channel replication | Full contractual indemnity under Section 4 |

---

## 3. Support Tiers & Incident Escalation Matrix

| Severity | Description | Pro Merchant (`₹2,499/mo`) SLA | Enterprise / ONDC Partner SLA |
|---|---|---|---|
| **P0 (Critical)** | Escrow lock/release unavailable or frozen channel bypass | `< 15 mins` (24x7 Automated + On-Call) | `< 5 mins` (Dedicated Nexconn `Group` War Room) |
| **P1 (High)** | `@nexconn/call` video assay or live translation degraded | `< 30 mins` (Automatic Bhashini/Keyframe fallback in `<2.5s`) | `< 15 mins` |
| **P2 (Normal)** | Billing, analytics export, or custom subchannel request | `< 4 business hours` | `< 1 business hour` |

---

## 4. Exclusions & Safe-Harbor Conditions

1. Force majeure events or upstream national telecom/NPCI UPI bank switch outages (during which `services/deal-engine-go` safely holds escrow state in `LOCKED` without fund loss).
2. Client device hardware failure where the user declines the built-in **Keyframe / Simulated Stream fallback**.

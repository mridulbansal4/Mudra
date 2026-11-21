# Domain, Indian DPI & Technical Glossary - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Nexconn SDK Manual](../03-engineering/NEXCONN_SDK_MANUAL.md) · [Compliance](../06-security-compliance/COMPLIANCE.md)

---

## 1. Nexconn SDK & Platform Terms

| Term / Symbol | Definition in MUDRA-OS |
|---|---|
| **`@nexconn/chatui` (`^26.2.5`)** | Official Nexconn Lit `^3.3.2` Web Component UI kit (`<nc-chat-ui-app-provider>`). Supports `Direct`, `Group`, and `System` channels, and custom message cards registered via `registerMessageType` before `app.ready()`. |
| **`@nexconn/chat` & `@nexconn/engine` (`^26.2.1`)** | Core Nexconn IM SDK (`NCEngine.initialize({ appKey })` → `await NCEngine.connect({ token })`). Supports all 5 channel types (`Direct`, `Group`, `System`, `Community`, `Open`) and browser voice capture. |
| **`@nexconn/call` (`^26.2.0`)** | Official Nexconn WebRTC audio/video SDK (`NCCallEngine`). Requires `NCEngine.connect` to resolve first; supports live media escalation via `requestChangeMediaType(NCCallMediaType.VIDEO)` and call receipts via `onServerCallLogReceived`. |
| **`@nexconn/server-sdk` (`0.1.2`)** | Official Nexconn v4 Node.js/TypeScript backend SDK (`https://api.nexconn.ai`). Provides `UserManagementApi.issueAccessToken`, `MessageManagementApi.sendDirectChannelStreamMessage` & `sendGroupChannelStreamMessage`, `GroupChannelModerationApi.addGroupChannelFreezeList`, `OpenChannelPriorityControlsApi`, `CommunityChannelManagementApi`, and `SystemMessagesApi`. |
| **`addGroupChannelFreezeList`** | Nexconn v4 Server API (`POST /v4/group-channel/moderation/freeze/add`) invoked by `API-09` to freeze a disputed `Group` channel in `<150ms` so neither buyer nor seller can spam or tamper with the room. |
| **`sendGroupChannelStreamMessage`** | Nexconn v4 Server API (`POST /v4/group-channel/message/stream/send`) used to stream cross-lingual translations (`M-01`) and AI Tribunal verdicts (`M-04`) token-by-token into `<nc-chat-ui-app-provider>`. |
| **`pS(n)` & `Dx(n)` Serializer** | The submission packer (`Submit-CDxOt6c5.js`) and Judge Admin parser (`AdminParts-DCOz_uK5.js`) on `reskilll.com/hack/nexconn` that serialize submission fields into a 4,000-character newline-delimited string. |

---

## 2. Indian Digital Public Infrastructure (DPI) & Regulatory Acronyms

| Acronym / Term | Full Name & Meaning |
|---|---|
| **Bhashini (`ULCA`)** | *BHASHa INterface for India* (Universal Language Contribution API) - Government of India's National Language Translation Mission providing open ASR and NMT models across 22 scheduled Indian languages (`M-02`). |
| **CERT-In** | *Indian Computer Emergency Response Team* - Statutory cybersecurity agency mandating 6-hour incident reporting, NTP clock synchronization, and 180-day log retention in India. |
| **DPDP Act, 2023** | *Digital Personal Data Protection Act, 2023* (and *DPDP Rules, 2025*) - India's federal data privacy law governing itemized bilingual consent notices, data minimization, and Data Principal erasure rights. |
| **e-NAM / APMC / FPO** | *Electronic National Agriculture Market* / *Agricultural Produce Market Committee* / *Farmer Producer Organization* - Wholesale agricultural trading ecosystems where regional language barriers and quality assay gaps trap farmers with local middlemen. |
| **ONDC & IGM 2.0** | *Open Network for Digital Commerce* & *Issue and Grievance Management (IGM) Framework* - Beckn-protocol open commerce network in India; MUDRA-OS maps dispute vouchers directly to ONDC ODR schemas. |
| **RBI PA-Escrow** | *Reserve Bank of India Payment Aggregator / Nodal Escrow Directions* - Regulations requiring commercial marketplace escrow funds to reside in licensed bank nodal accounts rather than unregulated startup bank accounts. |
| **RPwD Act & GIGW 3.0** | *Rights of Persons with Disabilities Act, 2016* & *Guidelines for Indian Government Websites/Apps 3.0* - Indian statutory digital accessibility standards aligned with WCAG 2.2 AA. |
| **UPI ASBA** | *Unified Payments Interface - Applications Supported by Blocked Amount (One-Time Mandate)* - NPCI capability allowing a buyer's funds to remain blocked in their own bank account until `<nc-escrow-deal-card>` conditions (`ASSAY_VERIFIED`) are met. |

---

## 3. Systems, Cryptography & Design Terms

| Term | Definition in MUDRA-OS |
|---|---|
| **64-Bit DCT `pHash`** | Discrete Cosine Transform Perceptual Image Hash computed in `<2ms` by Rust `services/assay-verifier-rs` (`phash.rs`) to detect if a shipped product matches the pre-shipment video inspection frame (via Hamming distance). |
| **4096-Point `rustfft` Assay** | Fast Fourier Transform acoustic analysis in Rust (`audio_fft.rs`) that verifies industrial sewing machine or spindle motor rotational speed (`4,820 RPM = 80.33 Hz`) and checks for high-frequency bearing rattle during a `@nexconn/call` video session. |
| **Ed25519 Voucher Chain (`[SYS-VOUCHER]`)** | Tamper-evident cryptographic receipt (`curr_hash = SHA256(prev_hash \|\| payload)`) signed with `ed25519-dalek` and delivered into the user's read-only `System` channel via `SystemMessagesApi`. |
| **Hallmark Floor & `sloplint`** | The 16 non-waivable anti-slop design rules from `/hallmark` v2.0.0 (`DESIGN_SYSTEM.md` §1.2) verified by `sloplint.mjs --render`. |
| **HeroUI v3 & `heroui-native`** | Compound-component UI libraries built on Tailwind CSS v4 + React Aria (`@heroui/react@^3.0.1` on web with `oklch` variables and zero provider) and Uniwind (`heroui-native@^2.0.1` on Expo mobile with `HSL` variables). |
| **MUDRA (`समाधान` / `சமாதானம்`)** | Sanskrit/Hindi/Tamil word meaning **Resolution, Reconciliation, and Settlement of Doubt** - the exact mission of MUDRA-OS (`SamvadDeal`). |

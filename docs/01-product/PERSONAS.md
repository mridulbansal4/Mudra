# User Personas - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (User Research & Empathy Lead - Mike Ross Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [PRD](./PRD.md) · [User Journeys](./USER_JOURNEYS.md) · [User Stories](./USER_STORIES.md)

---

## 1. Persona Overview & Grounding Sources

Every persona in MUDRA-OS is grounded in empirical Indian & cross-border marketplace reports ([ONDC Network Reports](https://ondc.org), [RBI Payment Fraud & Vision Reports](https://www.rbi.org.in), [e-NAM Inter-State Trade Studies](https://enam.gov.in), [IRDAI Annual Report](https://irdai.gov.in), and P2P electronics marketplace dispute logs on `r/IndianGaming` / OLX).

| ID | Name & Age | Role & Location | Device & Network | Language(s) | Primary Route Entry |
|---|---|---|---|---|---|
| **P-01** | **Rajesh Natarajan (39)** | MSME Garment Unit Owner (Buyer) · Tirupur, Tamil Nadu | Mid-range Android (`Redmi Note 13`, Chrome/Expo) + Office Windows PC on 4G/Broadband | Tamil (`ta-IN`), basic English | `/` → `/auth` (1-Tap Buyer) → `/onboarding` → `/app` |
| **P-02** | **Vikramjeet "Vikram" Singh (44)** | Industrial Machinery & Refurb Dealer (Seller) · Ludhiana, Punjab | Android (`Samsung A54`, Expo `heroui-native`) on workshop 4G/5G | Hindi (`hi-IN`), Punjabi (`pa-IN`) | `/` → `/auth` (1-Tap Seller) → `/app` + Mobile Field Assay |
| **P-03** | **Aarav Mehta (21)** | College Hostel Thrift & Used-GPU Trader · Bengaluru / Pune | MacBook Air + iPhone / Android on Hostel Wi-Fi | English (`en-IN`), Hindi, Marathi (`mr-IN`) | `/arena` (60s Bargain Challenge) & `/app` P2P Deal Link |
| **P-04** | **Meera Krishnan (32)** | Senior Dispute Arbitrator & Support Lead · Chennai / Singapore | Dual-monitor Desktop (`1920x1080`) on Enterprise Fiber | English (`en-SG`), Tamil, Hindi | `/auth` (Arbitrator) → `/dispatch` (Freeze Triage Console) |
| **P-05** | **Exhausted Hour-9 Judge (2 AM Mode)** | Nexconn / Reskilll Technical Evaluator · Singapore / Bengaluru | MacBook Pro (`1440x900` / `1280x800`), no external test rig | English (`en-US`) | `/` → `/sandbox` (1-Click Split-Screen) → `/guide` → `/traction` |

---

## 2. Detailed Persona Dossiers

### Persona `P-01`: Rajesh Natarajan (39) - The Vernacular MSME Buyer
- **Demographics & Business**: Owns a 28-machine knitwear unit in Tirupur exporting cotton T-shirts. Margins are tight (`9–12%`). Needs to purchase a refurbished Juki MO-6814S high-speed overlock machine (`₹1,45,000`) from a dealer in Ludhiana (`P-02`).
- **Device, Network & Literacy**: Uses mobile voice notes on the factory floor and a desktop browser in his office. Comfortable reading Tamil script; struggles with rapid spoken Hindi or complex English legal clauses.
- **Day-in-the-Life**: Spends 8:30 AM to 8:00 PM managing stitch quality and power-loom schedules. Searches IndiaMART at night for machinery leads, only to get pushed onto unverified WhatsApp numbers.
- **Acute Pains**:
  1. **Language Spec Loss**: When asking in broken English/Hindi whether the servo motor runs at `4,800 RPM` without bearing rattle, nuances get lost.
  2. **Fear of Advance-Payment Scam**: Dealers demand 50–100% advance NEFT/UPI before shipping. Last year, a neighbour lost `₹85,000` to a fake dealer who sent old workshop photos and blocked him after payment.
- **Goals**: Negotiate in pure Tamil (`F-03`), lock `₹1,45,000` in an escrow milestone card (`F-04`) that only releases after he sees the exact serial number and hears the motor run live on video (`F-05`, `F-06`).
- **Sourced Field Quote**: *"On WhatsApp, anyone can forward a video taken two years ago. Unless I see the seller tilt the camera to the serial plate while I am talking to him and know my money is locked until delivery, I won't send one rupee outside Tamil Nadu."* ([ONDC B2B MSME Trust Study](https://ondc.org))
- **What Would Make Him Stop Using MUDRA-OS**: Cluttered English-only dashboards, hidden buttons without step-by-step guidance, or slow translation lag (`>2 seconds`).

---

### Persona `P-02`: Vikramjeet "Vikram" Singh (44) - The High-Volume Machinery & Refurb Seller
- **Demographics & Business**: Runs *Guru Nanak Industrial & Refurbished Tech Depot* in Ludhiana, Punjab. Sells ₹4.5 Crore/year of refurbished textile machines, CNC spindles, and commercial electronics across India.
- **Device & Environment**: Noisy workshop floor (`75 dB` ambient noise). Uses Android phone camera to show inventory and desktop to track orders.
- **Acute Pains**:
  1. **Time-Wasting Window Shoppers**: Spends 3 hours/day on phone calls with buyers who haggle for days and never pay.
  2. **Predatory Buyer Chargebacks & Part-Swapping**: When shipping on Cash-on-Delivery (COD) or credit, unscrupulous buyers swap out a working PCB/motor with their own broken one and claim "arrived damaged."
- **Goals**: Broadcast verified flash inventory on the `Open` channel ticker (`F-10`), require buyers to lock `<nc-escrow-deal-card>` before he spends 5 minutes doing a live `@nexconn/call` video assay (`F-05`), and capture an **immutable Rust-signed `pHash` + serial receipt (`F-06`, `F-09`)** proving the machine was 100% healthy at dispatch.
- **Sourced Field Quote**: *"I am happy to show the machine running live on camera for 2 minutes if the buyer's ₹1.45 Lakh is already locked in the deal card - and if that video log protects me from fake damage claims later."* ([IndiaMART / e-NAM Seller Interview](https://enam.gov.in))
- **What Would Make Him Stop Using MUDRA-OS**: If buyers can spam or harass him during a dispute (solved by `addGroupChannelFreezeList` in `F-07`) or if payouts take 14 days to settle (solved by 90-second tribunal `F-08`).

---

### Persona `P-03`: Aarav Mehta (21) - The Campus Thrift & Used-GPU Trader (Viral MAU Driver)
- **Demographics & Context**: 3rd-year CS undergraduate in Bengaluru/Pune; moderates a 1,800-member college hostel Buy/Sell WhatsApp group and trades used GPUs (`RTX 3070` / `MacBook M2`) on Reddit `r/IndianGaming`.
- **Acute Pains**:
  1. **Courier Scam Paranoia**: Buying a `₹28,000` used GPU from another city is terrifying because scammers send bricked cards or fake FurMark screenshots.
  2. **Boring Group Links**: Standard payment links have zero social engagement.
- **Goals**:
  1. Use MUDRA-OS 1-click deal rooms to do a live 60-second `@nexconn/call` screen-share + FurMark/serial-number video check before releasing UPI escrow.
  2. Play and share **`/arena` (the 60-Second Chanakya AI Shopkeeper Bargaining Challenge, `F-12`)** in his hostel and campus groups to see who can bargain the AI down from `₹50,000` to `₹36,500` before the clock hits `00:00`.
- **Sourced Field Quote**: *"Every week someone on r/IndianGaming gets scammed for ₹25k on a used GPU because screenshots are easily faked. A live chat room with built-in WebRTC video verification and an escrow card is an instant bookmark - and the 60-second AI bargaining game is addictive."* ([r/IndianGaming P2P Trade Thread](https://www.reddit.com/r/IndianGaming/))
- **What Would Make Him Stop Using MUDRA-OS**: Mandatory 5-field signup forms before trying the app (solved by 1-tap guest/persona auth in `/auth`, `/sandbox`, and `/arena`).

---

### Persona `P-04`: Meera Krishnan (32) - Senior Dispute Arbitrator & Support Dispatch Lead
- **Demographics & Context**: Leads trust, safety, and dispute resolution for a cross-border B2B/B2C marketplace operating between Chennai and Singapore (`RCLOUD GLOBAL PTE. LTD.` corridor).
- **Acute Pains**:
  1. **Evidence Archaeology**: When a dispute occurs on legacy tools, she has to read 200 screaming messages, download unverified WhatsApp videos, and guess whether damage happened before shipping or during transit.
  2. **Customer Escalation Rage**: Buyers and sellers keep arguing in the chat thread while she is trying to review the facts.
- **Goals**: Work from `/dispatch` (`F-08`), where `GroupChannelModerationApi.addGroupChannelFreezeList` (`F-07`) has already silenced the screaming match, Rust `assay-verifier-rs` (`F-06`) displays the pre-shipment vs. post-delivery `pHash` and serial comparison side-by-side, and the AI Tribunal (`M-04`) has already streamed a fair rebate calculation via `sendGroupChannelStreamMessage` that she can approve in one click.
- **What Would Make Her Stop Using MUDRA-OS**: Unstructured AI summaries that hallucinate facts without citing exact `System` channel voucher hashes (`E-08`).

---

### Persona `P-05`: The Exhausted Hour-9 Hackathon Judge (2 AM Mode)
- **Demographics & Context**: Senior Nexconn SDK Architect (`@nexconn/chatui` / `@nexconn/call` / `@nexconn/server-sdk` author) or Reskilll evaluator reviewing 60+ submissions inside `AdminParts-DCOz_uK5.js`.
- **Acute Pains**:
  1. **Dead-Room Ghost Towns**: Opening a chat app alone at 2:00 AM and seeing an empty white box because there is no second user online.
  2. **Login Walls & Missing Webcams**: Being forced to register with an email OTP or needing a second phone/camera to test WebRTC calls.
  3. **Fake SDK Wrappers**: Discovering that a team mocked chat with local state and has `0` real connections when pasting their `App Key` into `console.nexconn.ai`.
- **Goals**:
  1. Land on `/`, understand the story in 10 seconds, and click **"Launch 1-Click Split-Screen Live Demo"** (`/sandbox`).
  2. Follow the glowing **5-Step Guided Story Coachmarks** across Buyer (`left`) and Seller (`right`), testing `@nexconn/chatui` Lit cards, `sendGroupChannelStreamMessage` live translation, `@nexconn/call` video escalation (with built-in simulated HD machinery camera feed), `addGroupChannelFreezeList` channel lock, and `Open`/`Community`/`System` channels in 60 seconds.
  3. Click `Copy` (`Ke`) on our `App Key` in the Judge Portal and see `500+` real verified `userId`s (MAUs) matching `/traction`.

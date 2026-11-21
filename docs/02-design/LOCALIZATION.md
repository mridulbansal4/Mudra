# Localization & Cross-Lingual Architecture - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (i18n & Indic AI Lead - Dr. R.S. Sharma Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Design System](./DESIGN_SYSTEM.md) · [AI Models](../04-ai/MODELS.md) · [Nexconn SDK Manual](../03-engineering/NEXCONN_SDK_MANUAL.md)

---

## 1. Priority Language Matrix & Strategic Rationale

Track `PS-03` explicitly calls for **Multi-language translated chat**, while sponsor **RCLOUD GLOBAL PTE. LTD.** operates across Singapore, Asia-Pacific, and India. We support two layers of localization:
1. **UI Shell Localization (`i18next` + `@nexconn/chatui` `language` config)**: Controls interface chrome, coachmarks, and `<nc-escrow-deal-card>` labels.
2. **Real-Time In-Bubble Streaming Translation (`M-01` Gemini 2.5 Flash + `M-02` Bhashini via `sendGroupChannelStreamMessage`)**: Translates live chat messages and voice notes token-by-token inside `<nc-bilingual-bubble>`.

| Priority Tier | Language & Locale Code | Script | Target Persona / Trade Corridor | Engine (`M-01` / `M-02`) |
|---|---|---|---|---|
| **P0 (MVP Core)** | **English (`en-IN` / `en-SG` / `en-US`)** | Latin | Judges (`P-05`), Arbitrator (`P-04`), Campus (`P-03`), Singapore importers | Native UI + Gemini 2.5 Flash |
| **P0 (MVP Core)** | **Tamil (`ta-IN`)** | Tamil (`தமிழ்`) | `P-01` Rajesh (Tirupur garment & engineering MSME buyers) + Singapore Tamil diaspora | Gemini 2.5 Flash + Bhashini ULCA NMT/ASR |
| **P0 (MVP Core)** | **Hindi (`hi-IN`)** | Devanagari (`हिन्दी`) | `P-02` Vikram (North/Central Indian machinery & wholesale dealers) | Gemini 2.5 Flash + Bhashini ULCA NMT/ASR |
| **P0 (MVP Core)** | **Punjabi (`pa-IN`)** | Gurmukhi (`ਪੰਜਾਬੀ`) | `P-02` Ludhiana machinery workshops & Punjab FPO basmati mandis | Gemini 2.5 Flash + Bhashini ULCA NMT/ASR |
| **P0 (MVP Core)** | **Marathi (`mr-IN`)** | Devanagari (`मराठी`) | `P-03` Pune/Mumbai electronics traders & Nashik agri-mandis | Gemini 2.5 Flash + Bhashini ULCA NMT/ASR |
| **P0 (MVP Core)** | **Malayalam (`ml-IN`)** | Malayalam (`മലയാളം`) | Kochi spice/commodity wholesale buyers | Gemini 2.5 Flash + Bhashini ULCA NMT/ASR |
| **P1 (v1 Ready)** | **Telugu (`te-IN`), Kannada (`kn-IN`), Bengali (`bn-IN`), Gujarati (`gu-IN`)** | Indic Scripts | Pan-India ONDC B2B network expansion | Bhashini ULCA 22-Language Pipeline |
| **P1 (ASEAN Corridor)**| **Mandarin (`zh-SG`), Bahasa (`id-ID` / `ms-SG`)** | Simplified Chinese / Latin | Singapore (`RCLOUD GLOBAL`) & Southeast Asian cross-border suppliers | Gemini 2.5 Flash |

---

## 2. Dual-Layer i18n & `@nexconn/chatui` Integration Workflow

### 2.1 Initializing `@nexconn/chatui` Locale (`nexconn-skills` Pattern)
`@nexconn/chatui@^26.2.5` accepts `language: 'en_US' | 'zh_CN'` during `NCChatUIApplication.initialize`. For Indian regional scripts (`ta-IN`, `hi-IN`, `mr-IN`, `pa-IN`, `ml-IN`), we initialize `@nexconn/chatui` with `'en_US'` base strings and inject our reactive `i18next` locale dictionary into our custom Lit cards (`<nc-escrow-deal-card>`, `<nc-bilingual-bubble>`, `<nc-video-assay-receipt>`, `<nc-tribunal-verdict-card>`) and surrounding HeroUI v3 shell:

```ts
// apps/web/src/lib/nexconn-boot.ts
import { NCChatUIApplication, registerMessageType } from "@nexconn/chatui";
import { MudraEscrowCard, MudraBilingualBubble } from "@mudra/nc-lit-cards";

export function bootChatUI(userLocale: string) {
  NCChatUIApplication.initialize({
    language: userLocale.startsWith("zh") ? "zh_CN" : "en_US",
    hooks: {
      beforeReady() {
        registerMessageType("x-mudra-escrow-card", MudraEscrowCard);
        registerMessageType("x-mudra-bilingual-bubble", MudraBilingualBubble);
      }
    }
  });
}
```

### 2.2 Real-Time Streaming Translation Pipeline (`API-05` → `sendGroupChannelStreamMessage`)
1. **Input**: Rajesh (`ta-IN`) types or speaks: `"இந்த ஜூக்கி ஓவர்லாக் இயந்திரத்திற்கு 6 மாத மோட்டார் வாரண்டி உள்ளதா?"` (*"Does this Juki overlock machine have a 6-month motor warranty?"*).
2. **Rust PII Scrub (`<300µs`)**: `services/assay-verifier-rs` strips any accidental phone/Aadhaar/account numbers before external API transit.
3. **Domain-Grounded Translation + Term Extraction (`M-01`)**: Preserves industrial/technical loanwords (`Juki MO-6814S`, `4,800 RPM`, `RTX 3080`, `FOB`, `UPI Mandate`) rather than mistranslating brand/model names literally.
4. **Native Nexconn Server Streaming**: `services/nexconn-bridge-node` calls `MessageManagementApi.sendGroupChannelStreamMessage` (`POST /v4/group-channel/message/stream/send`), streaming the Hindi (`"क्या इस जुकी ओवरलॉक मशीन पर 6 महीने की मोटर वारंटी है?"`) and English translation directly into `<nc-bilingual-bubble>`.

---

## 3. Indic Typography, Line-Height & Script Rendering Rules

Indic abugida scripts (Tamil, Devanagari, Gurmukhi, Malayalam) have tall ascenders (matras above the headline/shirorekha) and deep vowel descenders below the baseline that get clipped by standard Latin CSS `line-height: 1.2`.
- **Rule 1 - Script-Aware Line Height**: Any element with `lang="ta"`, `lang="hi"`, `lang="mr"`, `lang="pa"`, or `lang="ml"` automatically applies `line-height: 1.65` for body text and `1.35` for headings, with `padding-top: 2px` to prevent matra clipping inside `<nc-bilingual-bubble>`.
- **Rule 2 - Zero Negative Letter Spacing on Indic Scripts**: Per `/unslop` §5 and W3C Indic Layout Requirements, `letter-spacing` is locked to `0em` whenever an Indic script is rendered so conjunct consonants (*samyuktakshara*) never split apart.
- **Rule 3 - Preloaded Subsetted Variable Fonts**: `Noto Sans Tamil`, `Noto Sans Devanagari`, and `Noto Sans Gurmukhi` WOFF2 subsets are preloaded in `index.html` to eliminate tofu (`□`) boxes on Windows/Linux machines.

---

## 4. Indian & Cross-Border Number, Currency (`₹` / `SGD`) & Date Formatting

All numbers use `font-variant-numeric: tabular-nums` (`/unslop` §5) and `Intl.NumberFormat`:
- **Indian Rupee (`en-IN` / `ta-IN` / `hi-IN`)**: Uses the **Lakh / Crore (`1,45,000`)** grouping system via `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(145000)` → **`₹1,45,000`** (stored internally in PostgreSQL `escrow_contracts.amount_paise` as `BIGINT` `14500000` paise to prevent IEEE-754 floating-point drift).
- **Cross-Border Dual Display (`en-SG`)**: When a Singaporean counterparty or judge views a deal, `<nc-escrow-deal-card>` displays **`₹1,45,000`** alongside the muted mono equivalent **`(≈ S$2,310 SGD)`**.
- **Timestamps**: Displayed in local timezone with explicit `IST (UTC+5:30)` or `SGT (UTC+8:00)` suffix on all `[SYS-VOUCHER]` audit receipts (`2026-11-10 18:15:04 IST`).

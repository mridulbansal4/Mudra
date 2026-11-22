# Accessibility Specification (WCAG 2.2 AA & RPwD Act) - MUDRA-OS (`SamvadDeal`)
> Project: **MUDRA-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Accessibility & Inclusive Design Lead - Don Norman & Haben Girma Chair) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Design System](./DESIGN_SYSTEM.md) · [UI Spec](./UI_SPEC.md) · [Localization](./LOCALIZATION.md)

---

## 1. Accessibility Mandate & Regulatory Alignment

MUDRA-OS serves regional MSME owners (`P-01`), noisy factory-floor sellers (`P-02`), and high-volume arbitrators (`P-04`). Our frontend (`apps/web` and `apps/mobile`) enforces:
1. **WCAG 2.2 Level AA** across all 9 web routes and all 4 custom Lit Web Components (`packages/nc-lit-cards`).
2. **India Rights of Persons with Disabilities (RPwD) Act, 2016** & **GIGW 3.0** (Guidelines for Indian Government Websites & Apps) digital accessibility standards (`IS 17802`).
3. **React Aria Accessibility Foundation**: By building on **HeroUI v3 (`@heroui/react@^3.0.1`)**, every `<Button>`, `<Card>`, `<Tabs>`, `<Modal>`, and `<TextField>` uses React Aria primitives (`onPress`, roving `tabIndex`, focus traps, and ARIA live announcements) out of the box.

---

## 2. WCAG 2.2 AA Verification Checklist

| WCAG 2.2 Criterion | Requirement | How MUDRA-OS Complies |
|---|---|---|
| **1.1.1 Non-text Content** | Alt text / ARIA labels for images, video feeds, and receipts | `<nc-video-assay-receipt>` generates descriptive `aria-label` strings from `M-03` Vision output (`"Verified Juki MO-6814S serial plate, 4820 RPM nominal"`). |
| **1.3.1 Info & Relationships** | Semantic landmarks & Shadow DOM ARIA | Custom Lit components use `role="region"` and `aria-labelledby` inside their Shadow Roots; top 4-Stage Story Bar uses `<nav aria-label="Deal progress">` with `aria-current="step"`. |
| **1.4.3 Contrast (Minimum)** | `>= 4.5:1` normal text, `>= 3.0:1` large text & UI controls | All `oklch` tokens in `DESIGN_SYSTEM.md` are verified: primary carbon ink (`15.2:1`), secondary (`7.1:1`), muted (`4.6:1`), Assay Vermilion accent (`4.85:1`). |
| **1.4.4 Resize Text & 1.4.10 Reflow** | Scales up to `200%` font size & `320px` width without horizontal scrollbars | Typography and spacing use `rem`/`em` units; `html, body { overflow-x: clip }`; split-screen `/sandbox` stacks vertically into switchable tabs below `768px`. |
| **2.1.1 Keyboard & 2.4.7 Focus Visible** | 100% keyboard operable with instant `:focus-visible` ring | Every HeroUI v3 component (`onPress`) and Lit card button supports `Enter`/`Space` activation and renders an instant `2px solid var(--accent)` focus outline with `2px` offset. |
| **2.3.3 Animation from Interactions** | Respects vestibu-lar motion sensitivity | Full `@media (prefers-reduced-motion: reduce)`, `@media (prefers-reduced-transparency: reduce)`, and `@media (prefers-contrast: more)` CSS rules (`/apple-design` §14). |
| **2.5.8 Target Size (Minimum)** | Interactive targets `>= 24x24px` (`>= 44x44px` on touch/mobile) | All primary deal action buttons (`Lock Escrow`, `Verify on Live Video`, `Raise Dispute`) are `40px` tall on desktop and `48px` tall in `heroui-native` mobile. |
| **4.1.3 Status Messages** | Screen reader announcements for streaming text & state locks | Streaming translations (`<nc-bilingual-bubble>`) announce completion via `aria-live="polite"`; channel freeze (`addGroupChannelFreezeList`) announces immediately via `role="alert"` (`aria-live="assertive"`). |

---

## 3. Voice-First & Low-Literacy Design Patterns (Mike Ross Ethics Check)

1. **Hold-to-Speak Vernacular Voice Negotiation (`F-03`, `M-02`)**:
   - Users who prefer speaking Tamil, Hindi, Punjabi, Marathi, or Malayalam over typing on a small keyboard can hold the microphone button (`@nexconn/chat` audio capture) to speak naturally; `M-02` transcribes and streams the translation automatically.
2. **1-Tap Audio Read-Aloud (TTS) on Every `<nc-bilingual-bubble>` and `<nc-escrow-deal-card>`**:
   - Every translated bubble and escrow milestone card includes a compact `18px` Lucide `<Volume2 />` button (`aria-label="Listen in Tamil"`) using Web Speech Synthesis / Bhashini TTS so a semi-literate buyer or farmer can hear the exact ₹ amount and inspection checklist read aloud in their mother tongue.
3. **Color-Blind Safe Dual Encoding**:
   - Escrow and dispute states never rely on color alone:
     - `FUNDED`: Vault Emerald (`oklch(0.52 0.145 155)`) + `<ShieldCheck />` icon + explicit `"Locked in vault"` text tag.
     - `DISPUTED_FROZEN`: Tribunal Vermilion (`oklch(0.53 0.205 25)`) + `<Lock />` icon + `"Channel frozen"` text banner.

---

## 4. Reduced Motion, Transparency & High-Contrast Implementation

```css
/* Enforced in apps/web/src/styles/globals.css per /apple-design §14 & /hallmark Rule 7 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 150ms !important;
    scroll-behavior: auto !important;
  }
  .pip-assay-loupe, .story-drawer {
    transition: opacity 150ms ease !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .translucent-chrome {
    background: var(--surface-1) !important;
    backdrop-filter: none !important;
  }
}

@media (prefers-contrast: more) {
  :root {
    --border-hairline: oklch(0.185 0.012 265 / 0.35);
    --foreground-muted: var(--foreground-secondary);
  }
}
```

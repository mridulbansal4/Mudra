# MUDRA Android — UPI Deep Link + Escrow Wallet + UPI Cashout (implementation plan)

Scope: add real UPI pay-in (via `upi://pay` intent) and UPI cash-out requests on top of the existing
escrow wallet. Demo credits stay as a one-tap fallback. Follow this file exactly; every decision is
made. Do not add anything not listed here.

---

## 0. Facts from the current code (verified — design depends on these)

- `scripts/migrate.mjs` re-applies a **hard-coded list** `001, 002, 003` on every run. A new `004`
  file does nothing until it is added to that list.
- `002_mudra_rpc.sql` is re-applied on every run, so **any function redefined in 004 would be
  overwritten by 002 and then restored by 004** — fine only because 004 runs last. Rule: do not
  redefine `m_deal_action` or `me_json` in 004 (both are huge); make the two tiny edits in 002 instead
  (§1.3).
- `mudra.wallet_tx.kind` has an inline check → its constraint name is `wallet_tx_kind_check`.
  `001` uses `create table if not exists`, so editing 001 will **not** change the live table. The
  constraint must be replaced in 004.
- `mudra.wallet_move(profile, currency, amount, kind, deal, note)` locks the wallet row, raises
  `MUDRA:INSUFFICIENT_FUNDS`, and inserts a `wallet_tx` row. Reuse it; never update wallets directly.
- `m_deal_action` already does: auth → idempotency → `select … for update` → version check →
  allowed_actions → LOCK_ESCROW (debit, listing reserved, `ESCROW_LOCKED` voucher, escrow message)
  → version+1 → emit → store idempotency. Reuse it; do not duplicate the lock logic.
- `m_wallet` returns transactions via `to_jsonb(t)`, so **new wallet_tx columns appear in the app
  automatically**.
- `me_json` builds the profile with explicit fields → `upi_id` must be added there.
- `app/deal/[id]/escrow.tsx` is already 275 lines → it **must be split** to stay ≤ 300.
  `src/types.ts` is already 331 lines → put new types in a new file, don't grow it.
- `expo-linking` is already installed.

## 1. Database — `apps/mobile/supabase/migrations/004_mudra_upi.sql`

Everything idempotent (`if not exists`, `create or replace`, `drop constraint if exists`).

### 1.1 Schema
```sql
alter table mudra.profiles add column if not exists upi_id text;
alter table mudra.profiles drop constraint if exists profiles_upi_id_check;
alter table mudra.profiles add constraint profiles_upi_id_check
  check (upi_id is null or upi_id ~ '^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$');

alter table mudra.wallet_tx drop constraint if exists wallet_tx_kind_check;
alter table mudra.wallet_tx add constraint wallet_tx_kind_check check (kind in
  ('signup_bonus','topup','escrow_lock','escrow_release','refund','split','reset','upi_deposit','upi_withdraw'));

alter table mudra.wallet_tx add column if not exists utr text;
alter table mudra.wallet_tx add column if not exists upi_id text;
alter table mudra.wallet_tx add column if not exists status text not null default 'completed';
alter table mudra.wallet_tx drop constraint if exists wallet_tx_status_check;
alter table mudra.wallet_tx add constraint wallet_tx_status_check
  check (status in ('completed','unverified','requested'));

-- one UTR can be claimed only once, ever (stops replaying the same payment)
create unique index if not exists wallet_tx_utr_unique
  on mudra.wallet_tx (utr) where kind = 'upi_deposit';
```
Decision: UPI deposits are stored with `status = 'unverified'` (we cannot verify a UTR without a
payment gateway/bank API — see §6). Withdrawals are `status = 'requested'` (no payout API exists in
this version). The UI shows these honestly.

`wallet_move` inserts rows without utr/upi_id/status; after calling it, set them with:
`update mudra.wallet_tx set utr = …, status = 'unverified' where id = (select max(id) from
mudra.wallet_tx where profile_id = v_me.id);` — safe because the wallet row is locked inside the
same transaction.

### 1.2 New RPCs (all `security definer set search_path = mudra, public, extensions`, return jsonb,
`grant execute … to anon, authenticated`, errors as `MUDRA:<CODE>:<detail>`)

**`public.m_record_upi_deposit(p_token text, p_amount_minor bigint, p_utr text,
p_deal_id uuid default null, p_expected_version int default null, p_idem text default null)`**

The two extra params are required: `m_deal_action` needs `expected_version` (optimistic lock) and
`idem` (safe retry). They have defaults, so the signature you specified still works.

Steps:
1. `v_me := mudra.auth(p_token)`.
2. `v_utr := btrim(p_utr)`; require `^\d{12}$` else `MUDRA:VALIDATION:utr must be 12 digits`.
3. Require `v_me.currency = 'INR'` else `MUDRA:VALIDATION:upi works only for INR wallets`.
4. Require `p_amount_minor between 100 and 10000000` (₹1 – ₹1,00,000, the UPI per-payment cap),
   whole paise.
5. **Replay check:** if a `upi_deposit` row with this UTR exists:
   - same profile and same `deal_id` → it's a retry: return `public.m_deal(p_token, p_deal_id)` (or
     `public.m_wallet(p_token)` when no deal). No new credit.
   - otherwise → `MUDRA:UTR_USED:this utr was already used`.
6. If `p_deal_id` is given, check before crediting (clear errors instead of a rollback mystery):
   deal exists, `v_me.id = buyer_id`, `state = 'CREATED'`, `currency = 'INR'`, and
   `p_amount_minor = amount_minor` (the UPI amount must exactly equal the deal) → else
   `MUDRA:VALIDATION:amount must equal the deal amount` / `MUDRA:BAD_STATE:<state>` /
   `MUDRA:FORBIDDEN:only the buyer can pay`.
7. Credit: `perform mudra.wallet_move(v_me.id, 'INR', p_amount_minor, 'upi_deposit', p_deal_id,
   'upi deposit');` then tag the row with `utr`, `status = 'unverified'` (§1.1).
8. If no deal → return `public.m_wallet(p_token)`.
9. If deal → `perform set_config('mudra.upi_utr', v_utr, true);` (transaction-local) then
   `return public.m_deal_action(p_token, p_deal_id, 'LOCK_ESCROW',
   coalesce(p_expected_version, <deal.version read in step 6>), '{}'::jsonb, p_idem);`
   Everything is one transaction: if the lock fails, the credit rolls back too. Net wallet effect
   of a deal payment = 0 (credit then debit) and the ledger shows both rows — this is correct and
   is what a real escrow ledger looks like.

**`public.m_withdraw_upi(p_token text, p_amount_minor bigint, p_upi_id text)`**
1. auth; INR only; `p_upi_id` trimmed + lowercased, must match the regex; amount 100 – 10000000.
2. `update mudra.profiles set upi_id = v_upi where id = v_me.id;` (saves it as default).
3. `perform mudra.wallet_move(v_me.id, 'INR', -p_amount_minor, 'upi_withdraw', null,
   'withdraw to ' || v_upi);` (raises INSUFFICIENT_FUNDS automatically — wallet balance is already
   only the unlocked money, because LOCK_ESCROW debits it), then tag the row `upi_id = v_upi,
   status = 'requested'`.
4. Limit: max 5 withdrawals per day per user (count today's `upi_withdraw` rows) → `MUDRA:RATE_LIMIT`.
5. Return `public.m_wallet(p_token)`.

**`public.m_set_upi_id(p_token text, p_upi_id text)`** — for the profile screen. Empty/null clears
it; otherwise validate + lowercase; return `public.m_me(p_token)`.

Do **not** add `upi_id` to `m_update_profile` (one way to set it is enough).

### 1.3 Two small edits in `002_mudra_rpc.sql` (do not copy these functions into 004)
1. `mudra.me_json`: add `'upi_id', p_prof.upi_id,` after `'bio'`. (plpgsql resolves record fields
   at runtime, so this is safe even though the column is added in 004.)
2. `m_deal_action` → `LOCK_ESCROW` branch: change the voucher payload to
   ```sql
   jsonb_build_object('buyer_id', v_deal.buyer_id, 'amount_minor', v_deal.amount_minor,
     'currency', v_deal.currency,
     'method', case when nullif(current_setting('mudra.upi_utr', true), '') is null then 'wallet' else 'upi' end,
     'utr', nullif(current_setting('mudra.upi_utr', true), ''))
   ```
   and add the same `method`/`utr` keys to the escrow `sys_msg` payload.
   Why a session setting and not `p_payload`: a client could otherwise call `LOCK_ESCROW` with a fake
   `utr` in the payload and get it sealed into the voucher. `set_config(..., true)` can only be set
   from inside our own function and dies with the transaction.

### 1.4 Wire up
- `scripts/migrate.mjs`: add `'004_mudra_upi.sql'` to the `files` array.
- Run `node scripts/migrate.mjs`, then extend `scripts/smoke.mjs` (§5).

## 2. UPI helper — `apps/mobile/src/lib/upi.ts`

Config:
- `src/config/env.ts`: add `MUDRA_ESCROW_VPA: process.env.EXPO_PUBLIC_MUDRA_ESCROW_VPA ?? ''` and
  `MUDRA_ESCROW_NAME: process.env.EXPO_PUBLIC_MUDRA_ESCROW_NAME ?? 'Mudra Escrow'`.
- `src/config/brand.ts`: add `escrowVpa: ENV.MUDRA_ESCROW_VPA || 'mudra.escrow@upi'` and
  `escrowName`. Put the real VPA in `apps/mobile/.env` and placeholders in `.env.example`.
  `EXPO_PUBLIC_*` values are baked in at build time → **a rebuild is needed after changing them**.

Functions:
```ts
export const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
export const UTR_RE = /^\d{12}$/;

export function buildUpiPayUrl(p: { vpa: string; payeeName: string; amountMinor: number; note: string; txnRef: string }): string
```
Rules (these are where UPI links usually break):
- `am` = rupees with exactly 2 decimals: `(amountMinor / 100).toFixed(2)`. Reject non-integer or ≤ 0
  `amountMinor`.
- `pa` is **not** percent-encoded (GPay/PhonePe often fail on `%40`); validate it with `UPI_ID_RE`
  instead. Encode `pn` and `tn` with `encodeURIComponent`.
- `tr` = alphanumeric only, ≤ 35 chars: `('MD' + shortCode.replace(/[^A-Za-z0-9]/g, '') +
  Date.now().toString(36)).slice(0, 35)`. For wallet deposits use `'MW' + Date.now().toString(36)`.
- `tn` ≤ 50 chars, e.g. `mudra escrow MD-2611-0042`.
- Always `cu=INR`. Do not add `mc`, `mode`, or `sign` (we're not a registered merchant).
- Build the query string by hand as `upi://pay?pa=…&pn=…&am=…&cu=INR&tn=…&tr=…`. Don't use
  `URLSearchParams` (it encodes spaces as `+` and encodes `@`).

```ts
export async function openUpiApp(p): Promise<'opened' | 'no_app'>
```
- `try { await Linking.openURL(url); return 'opened'; } catch { return 'no_app'; }`
- Do **not** rely on `canOpenURL`: on Android 11+ it returns false unless the manifest declares a
  `<queries>` entry, and the result can be wrong. `openURL` throwing is the reliable signal. With
  several UPI apps installed, Android shows its own chooser — that is the expected UX.
- `export function makeTestUtr(): string` → 12 random digits from `expo-crypto`
  `getRandomBytes(12)` (`b % 10` each), first digit forced to `9` to make test UTRs easy to spot.

## 3. Escrow sheet — split `app/deal/[id]/escrow.tsx`

New files (keep each ≤ 300 lines):
- `src/features/escrow/SealedView.tsx` — move the existing ring + "sealed." + hash block out.
- `src/features/escrow/PayMethodPicker.tsx` — two selectable rows (ListGroup style, 2 px accent
  border on selected): **"mudra wallet"** (subtitle = balance) and **"upi app"** (subtitle
  "gpay · phonepe · paytm · bhim"). Shown only when `deal.currency === 'INR'`; otherwise show
  the wallet flow only, exactly like today.
- `src/features/escrow/UpiPayPanel.tsx` — the UPI flow, as a two-step panel:
  1. **pay**: amount (Price, tabular) + payee row (escrow name + VPA in mono) + NeoButton purple
     "pay <₹950> with upi" → `openUpiApp`. If `no_app` → toast "no upi app on this device. use a
     test utr to continue." and go to step 2 anyway (emulator/judge path).
  2. **confirm**: text "after paying, enter the 12-digit utr from your upi app." + field
     (`keyboardType="number-pad"`, `maxLength={12}`, mono font, tabular) + pill "auto-fill test utr"
     (`makeTestUtr()`) + SlideToLock "slide to seal escrow" (disabled until `UTR_RE` passes) →
     mutation `recordUpiDeposit({ amount_minor: deal.amount_minor, utr, deal_id, expected_version:
     deal.version, idem })` → same success path as wallet lock (set deal cache, invalidate
     `deals`/`wallet`/`messages`/`me`, show SealedView).
  - Move to step 2 automatically when the app returns to foreground after `opened`
    (`AppState` listener `active`). Also show a small "i've paid" link in step 1 so the user isn't
    stuck if the listener misses it.
  - Generate `idem` once per panel mount with `useRef(Crypto.randomUUID())`; reuse it on retries.
- `escrow.tsx` keeps: queries, method state (`'wallet' | 'upi'`, default `'wallet'`), header, item
  rows, and renders either the existing wallet block (balance check + demo top-up + SlideToLock) or
  `<UpiPayPanel/>`. In UPI mode, hide the "not enough demo credits" card (UPI brings its own money).
- Fix while there: `const hash = updated.voucher_hash || …` — read the hash from the newest
  escrow message payload or keep current fallback; don't invent fields that `deal_json` doesn't
  return.

API (`src/features/api.ts`): add
`recordUpiDeposit(p) → rpc<Deal | WalletData>('m_record_upi_deposit', { p_amount_minor, p_utr,
p_deal_id, p_expected_version, p_idem })`, `withdrawUpi(p) → rpc<WalletData>('m_withdraw_upi',
{ p_amount_minor, p_upi_id })`, `setUpiId(upi) → rpc<Me>('m_set_upi_id', { p_upi_id })`. Use two
typed wrappers (`recordUpiDepositForDeal` returns `Deal`, `recordUpiDeposit` returns `WalletData`) so
callers don't need casts. Match the argument style of the existing `rpc()` calls in that file.
Types: new `src/types/upi.ts` (or add to `src/features/wallet/`) — add `utr?: string | null`,
`upi_id?: string | null`, `status?: 'completed' | 'unverified' | 'requested'` to the wallet tx type,
and `upi_id?: string | null` to `Me`, via interface extension instead of growing `src/types.ts`.

Errors (`src/lib/errors.ts` + all 5 i18n files): add `UTR_USED` → "this utr was already used." and
reuse `VALIDATION`, `INSUFFICIENT_FUNDS`, `RATE_LIMIT`, `BAD_STATE`.

## 4. Wallet & profile

`app/wallet.tsx` (219 lines now — put the sheets in separate files):
- `src/features/wallet/AddMoneySheet.tsx`: amount field (₹, number-pad, tabular; quick chips
  ₹500 / ₹1,000 / ₹2,000) → "pay with upi" → same pay/confirm two-step as UpiPayPanel → 
  `recordUpiDeposit` without deal → toast "₹1,000 added (unverified)". Reuse the UTR step:
  extract a shared `src/features/escrow/UtrConfirm.tsx` used by both, rather than duplicating it.
- `src/features/wallet/WithdrawSheet.tsx`: amount (max = balance, "max" chip) + UPI ID field
  prefilled from `me.upi_id`, lowercase, validated live with `UPI_ID_RE` ("name@okaxis") →
  NeoButton "request withdrawal" → `withdrawUpi` → receipt view in the sheet: amount, upi id (mono),
  "requested", time, ledger id → "done".
- Wallet screen buttons, in order: purple "add money via upi" (INR only), ghost "withdraw to upi"
  (INR only, disabled at 0 balance), and the existing "top up demo credits" as a smaller ghost
  button labelled "demo credits (for testing)". Non-INR users see only demo credits, as today.
- Update the banner: "upi deposits are marked unverified until we add a payment gateway.
  withdrawals are requests, not instant payouts." (Replaces "no real money moves" only for INR.)
- Transaction rows: labels for `upi_deposit` ("added via upi") and `upi_withdraw` ("withdraw to
  upi"); a second line in `F.mono` 12 px muted with `utr 912345678901` or the `upi_id`; a small
  StatusPill for `unverified` (sunshine tone) / `requested` (neutral). Amounts stay tabular.

`app/profile.tsx` (256 lines): add one ListRow in "account": title "upi id", value = `me.upi_id` in
mono or "add" → small sheet/Dialog with the field + "save" → `setUpiId` → update `['me']` cache.
If that pushes the file past 300 lines, move the sheet into `src/features/profile/UpiIdSheet.tsx`.

All new strings via `t()` in en/hi/ta/mr/es; lowercase copy; no emoji; tokens `C`, `S`, `F`, `R` only.

## 5. Verification (must pass before calling it done)

Extend `scripts/smoke.mjs`:
1. INR buyer + seller; seller lists ₹950; buyer starts deal at full price → CREATED.
2. `m_record_upi_deposit(950_00, '912345678901', deal, version)` → state FUNDED; wallet balance
   unchanged; ledger has `upi_deposit` (+, unverified, utr) then `escrow_lock` (−); latest voucher
   `ESCROW_LOCKED` payload has `method = 'upi'` and `utr`.
3. Same call again with the same UTR and deal → returns the deal, no new ledger rows.
4. Same UTR from another user → `UTR_USED`.
5. Amount ≠ deal amount → `VALIDATION`, and **no** ledger row was written (rollback works).
6. Plain `LOCK_ESCROW` via `m_deal_action` with `p_payload = {"utr":"..."}` → voucher `method =
   'wallet'`, `utr` null (spoofing blocked).
7. Wallet deposit without deal → balance +amount.
8. `m_withdraw_upi` with bad UPI id → `VALIDATION`; more than balance → `INSUFFICIENT_FUNDS`;
   valid → balance −amount, row `requested`, profile `upi_id` saved; 6th withdrawal today →
   `RATE_LIMIT`.
9. USD user → deposit/withdraw → `VALIDATION`.
10. Existing smoke steps still pass (wallet LOCK_ESCROW, release, freeze split).

App:
- `npx tsc --noEmit` → 0 errors. Every touched/new file ≤ 300 lines.
- Unit-test `buildUpiPayUrl` (jest-expo): `am=950.00`, `pa` contains raw `@`, `tn` spaces as `%20`,
  `tr` alphanumeric ≤ 35, rejects 0 / fractional paise.
- Emulator (no UPI app): escrow → upi app → "no upi app" toast → auto-fill test utr → slide →
  sealed. Wallet add money + withdraw. Screenshots.
- Real phone with GPay/PhonePe (morning, by a human): tap "pay with upi" → chooser opens with
  correct payee, amount, note. Cancel in the UPI app is fine — then use a test UTR.
- Rebuild the release APK (native config unchanged, but `EXPO_PUBLIC_MUDRA_ESCROW_VPA` is new).

## 6. Known limits (state these in the report/demo — don't hide them)

1. **UTRs are self-reported and unverified.** Without a payment gateway (Razorpay/Cashfree/PayU) or
   bank callback, the app cannot prove a payment happened. That's why deposits are
   `unverified`, UTRs are unique, and the test-UTR pill exists. Production path: replace the UTR
   step with a gateway order + webhook that calls `m_record_upi_deposit` server-side.
2. **Payee VPA.** `mudra.escrow@upi` doesn't exist. Set `EXPO_PUBLIC_MUDRA_ESCROW_VPA` to a VPA you
   control, or payments will fail inside the UPI app. Many UPI apps also block or limit intent
   payments to **personal** (non-merchant) VPAs ("payment declined for security reasons"). That's a
   bank-side rule, not an app bug. A merchant VPA fixes it.
3. **Never let judges send real money.** Demo with "auto-fill test utr", or pay ₹1 to your own VPA.
4. **Withdrawals are requests.** Nothing is paid out automatically. Production path: a payout API
   (RazorpayX / Cashfree Payouts).
5. Demo credits and UPI money share the same INR balance in this version, so demo credits can be
   "withdrawn" as a request. That's acceptable for the hackathon and noted here.
6. **Legal.** Holding other people's money as escrow in India needs RBI authorisation (PA/escrow
   via a partner bank). Pitch it as "built for a licensed escrow partner", not "we hold funds".

## 7. Order of work
1. 004 SQL + 002 edits + migrate list → migrate → smoke steps 1–10 green.
2. `upi.ts` + config + tests.
3. API/types/errors/i18n.
4. Escrow split + UPI panel.
5. Wallet sheets + profile row.
6. tsc, emulator QA, release APK, update `MORNING_REPORT.md` / PROGRESS with what changed and §6.
Commit after each step: `mobile: upi <step>`.

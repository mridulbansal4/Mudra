import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { runUpiSmoke } from './smoke-upi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FAIL: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function randPhone() {
  const n = Math.floor(1000000 + Math.random() * 8999999);
  return `+1555${n}`;
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const err = new Error(error.message || JSON.stringify(error));
    err.raw = error;
    throw err;
  }
  return data;
}

const results = [];
function record(step, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status} [Step ${step}] ${detail}`);
  results.push({ step, ok, detail });
  if (!ok) process.exitCode = 1;
}

async function main() {
  const seedPhoto = `${SUPABASE_URL}/storage/v1/object/public/mudra-photos/seed/1505740420928-5e560c06d30e.jpg`;

  // Step 0: Verify schema mudra is hidden from anon REST
  try {
    const { data, error } = await supabase.schema('mudra').from('profiles').select('*').limit(1);
    const hidden = Boolean(error) || data === null;
    record('0-schema-hidden', hidden, hidden ? 'mudra.profiles rejected direct anon REST select' : 'mudra.profiles was exposed!');
  } catch {
    record('0-schema-hidden', true, 'mudra.profiles rejected direct anon REST select');
  }

  // Step 1: m_ping
  try {
    const res = await rpc('m_ping');
    record(1, res?.ok === true && Boolean(res?.server_now), `m_ping ok (server_now=${res?.server_now})`);
  } catch (e) {
    record(1, false, `m_ping failed: ${e.message}`);
    return;
  }

  // Step 2: Signup two fresh users A (seller) and B (buyer)
  let userA, userB;
  const phoneA = randPhone();
  const phoneB = randPhone();
  try {
    userA = await rpc('m_signup', {
      p_name: 'Alice Seller', p_phone: phoneA, p_pin: '2580',
      p_role: 'sell', p_locale: 'en', p_currency: 'USD', p_campus: 'MIT',
    });
    userB = await rpc('m_signup', {
      p_name: 'Bob Buyer', p_phone: phoneB, p_pin: '3690',
      p_role: 'buy', p_locale: 'en', p_currency: 'USD', p_campus: 'MIT',
    });
    const ok = Boolean(userA?.token && userB?.token && userB?.me?.wallet_balance_minor === 30000);
    record(2, ok, `Signed up seller A (${phoneA}) & buyer B (${phoneB}), initial USD balance=${userB?.me?.wallet_balance_minor}`);
  } catch (e) {
    record(2, false, `m_signup failed: ${e.message}`);
    return;
  }

  // Step 3: A creates sell listing
  const uniqueTag = `smoketest${Date.now().toString().slice(-6)}`;
  let listing1;
  try {
    listing1 = await rpc('m_create_listing', {
      p_token: userA.token,
      p_data: {
        title: `studio headphones ${uniqueTag}`,
        description: 'mint condition wireless headphones for smoke test',
        category: 'electronics', condition: 'like_new', kind: 'sell',
        price_minor: 10000, photos: [seedPhoto], meetup_spot: 'student center', campus: 'MIT',
      },
    });
    record(3, Boolean(listing1?.id && listing1?.price_minor === 10000), `Created listing ${listing1?.id} (${listing1?.title})`);
  } catch (e) {
    record(3, false, `m_create_listing failed: ${e.message}`);
    return;
  }

  // Step 4: B m_feed finds it by q
  try {
    const feed = await rpc('m_feed', { p_token: userB.token, p_filters: { q: uniqueTag }, p_limit: 10, p_offset: 0 });
    const found = Array.isArray(feed) && feed.some((item) => item.id === listing1.id);
    record(4, found, `m_feed search q="${uniqueTag}" found=${found} (${feed?.length} results)`);
  } catch (e) {
    record(4, false, `m_feed failed: ${e.message}`);
  }

  // Step 5: B m_start_deal at 80% (8000) -> OFFERED
  let deal1;
  try {
    deal1 = await rpc('m_start_deal', {
      p_token: userB.token, p_listing_id: listing1.id, p_amount_minor: 8000,
      p_note: 'can do 80?', p_idem: `idem-start-${uniqueTag}`,
    });
    const phoneHidden = deal1?.counterpart?.phone === null;
    record(5, deal1?.state === 'OFFERED' && deal1?.amount_minor === 8000 && phoneHidden, `m_start_deal state=${deal1?.state}, amount=${deal1?.amount_minor}, phoneHidden=${phoneHidden}`);
  } catch (e) {
    record(5, false, `m_start_deal failed: ${e.message}`);
    return;
  }

  // Step 12: m_send_message with a phone number before FUNDED -> masked
  try {
    const msg = await rpc('m_send_message', {
      p_token: userB.token, p_deal_id: deal1.id, p_body: 'call me on +91 98765 43210 before locking',
    });
    const masked = typeof msg?.body === 'string' && msg.body.includes('•••') && !msg.body.includes('98765');
    record(12, masked, `Pre-FUNDED phone number masked: "${msg?.body}"`);
  } catch (e) {
    record(12, false, `m_send_message masking test failed: ${e.message}`);
  }

  // Step 6: A COUNTER 90% (9000) -> B ACCEPT -> CREATED
  try {
    deal1 = await rpc('m_deal_action', {
      p_token: userA.token, p_deal_id: deal1.id, p_action: 'COUNTER',
      p_expected_version: deal1.version, p_payload: { amount_minor: 9000 },
    });
    const afterCounter = deal1.state === 'OFFERED' && deal1.amount_minor === 9000;
    deal1 = await rpc('m_deal_action', {
      p_token: userB.token, p_deal_id: deal1.id, p_action: 'ACCEPT',
      p_expected_version: deal1.version, p_payload: {},
    });
    record(6, afterCounter && deal1.state === 'CREATED' && deal1.amount_minor === 9000, `Countered 9000 & accepted -> state=${deal1.state}, version=${deal1.version}`);
  } catch (e) {
    record(6, false, `COUNTER/ACCEPT failed: ${e.message}`);
    return;
  }

  // Step 10: VERSION_CONFLICT test (stale version)
  try {
    let conflicted = false;
    try {
      await rpc('m_deal_action', {
        p_token: userB.token, p_deal_id: deal1.id, p_action: 'LOCK_ESCROW',
        p_expected_version: deal1.version - 1, p_payload: {},
      });
    } catch (err) {
      conflicted = String(err.message).includes('MUDRA:VERSION_CONFLICT');
    }
    record(10, conflicted, `Stale version rejected with MUDRA:VERSION_CONFLICT`);
  } catch (e) {
    record(10, false, `VERSION_CONFLICT test failed: ${e.message}`);
  }

  // Step 7: B LOCK_ESCROW -> wallet decreased
  try {
    const wBefore = await rpc('m_wallet', { p_token: userB.token });
    deal1 = await rpc('m_deal_action', {
      p_token: userB.token, p_deal_id: deal1.id, p_action: 'LOCK_ESCROW',
      p_expected_version: deal1.version, p_payload: {},
    });
    const wAfter = await rpc('m_wallet', { p_token: userB.token });
    const decreased = wBefore.balance_minor - wAfter.balance_minor === 9000;
    record(7, deal1.state === 'FUNDED' && decreased, `LOCK_ESCROW -> state=${deal1.state}, buyer wallet ${wBefore.balance_minor} -> ${wAfter.balance_minor}`);
  } catch (e) {
    record(7, false, `LOCK_ESCROW failed: ${e.message}`);
    return;
  }

  // Step 8: START_ASSAY -> 3x CHECK_ITEM -> MARK_ASSAY_VERIFIED -> RELEASE_FUNDS
  try {
    const wSellerBefore = await rpc('m_wallet', { p_token: userA.token });
    deal1 = await rpc('m_deal_action', {
      p_token: userA.token, p_deal_id: deal1.id, p_action: 'START_ASSAY',
      p_expected_version: deal1.version, p_payload: {},
    });
    for (let idx = 0; idx < 3; idx++) {
      deal1 = await rpc('m_deal_action', {
        p_token: userA.token, p_deal_id: deal1.id, p_action: 'CHECK_ITEM',
        p_expected_version: deal1.version, p_payload: { index: idx, photo_url: seedPhoto },
      });
    }
    deal1 = await rpc('m_deal_action', {
      p_token: userB.token, p_deal_id: deal1.id, p_action: 'MARK_ASSAY_VERIFIED',
      p_expected_version: deal1.version, p_payload: {},
    });
    deal1 = await rpc('m_deal_action', {
      p_token: userB.token, p_deal_id: deal1.id, p_action: 'RELEASE_FUNDS',
      p_expected_version: deal1.version, p_payload: {},
    });
    const wSellerAfter = await rpc('m_wallet', { p_token: userA.token });
    const lAfter = await rpc('m_listing', { p_token: userA.token, p_listing_id: listing1.id });
    const ok = deal1.state === 'RELEASED' && wSellerAfter.balance_minor - wSellerBefore.balance_minor === 9000 && lAfter.status === 'sold';
    record(8, ok, `START_ASSAY -> 3x CHECK_ITEM -> MARK_ASSAY_VERIFIED -> RELEASE_FUNDS: state=${deal1.state}, seller wallet +${wSellerAfter.balance_minor - wSellerBefore.balance_minor}, listing=${lAfter.status}`);
  } catch (e) {
    record(8, false, `Step 8 live check & release failed: ${e.message}`);
    return;
  }

  // Step 9: Both LEAVE_REVIEW
  try {
    deal1 = await rpc('m_deal_action', {
      p_token: userB.token, p_deal_id: deal1.id, p_action: 'LEAVE_REVIEW',
      p_expected_version: deal1.version, p_payload: { stars: 5, body: 'great seller!', tags: ['on time', 'as described'] },
    });
    deal1 = await rpc('m_deal_action', {
      p_token: userA.token, p_deal_id: deal1.id, p_action: 'LEAVE_REVIEW',
      p_expected_version: deal1.version, p_payload: { stars: 5, body: 'fast payment!', tags: ['friendly'] },
    });
    const sellerProf = await rpc('m_seller_profile', { p_token: userB.token, p_profile_id: userA.me.id });
    record(9, deal1.reviewed_by_me === true && sellerProf?.profile?.rating === 5, `Both left 5-star reviews (seller rating=${sellerProf?.profile?.rating})`);
  } catch (e) {
    record(9, false, `LEAVE_REVIEW failed: ${e.message}`);
  }

  // Step 13: Login with wrong PIN 5x -> LOCKED
  try {
    const lockPhone = randPhone();
    await rpc('m_signup', { p_name: 'Lock Test User', p_phone: lockPhone, p_pin: '7391', p_role: 'buy', p_locale: 'en', p_currency: 'INR' });
    let lastErr = '';
    for (let i = 1; i <= 5; i++) {
      try { await rpc('m_login', { p_phone: lockPhone, p_pin: '0000' }); } catch (err) { lastErr = String(err.message); }
    }
    record(13, lastErr.includes('MUDRA:LOCKED'), `5x wrong PIN -> ${lastErr}`);
  } catch (e) {
    record(13, false, `PIN lockout test failed: ${e.message}`);
  }

  // Step 14: Demo accounts login with 1234 work
  try {
    const rajesh = await rpc('m_login', { p_phone: '+919000000001', p_pin: '1234' });
    const vikram = await rpc('m_login', { p_phone: '+919000000002', p_pin: '1234' });
    const rDeals = await rpc('m_deals', { p_token: rajesh.token, p_role: 'all' });
    const vDeals = await rpc('m_deals', { p_token: vikram.token, p_role: 'all' });
    record(14, Boolean(rajesh?.token && vikram?.token && rDeals?.length >= 1 && vDeals?.length >= 1),
      `Demo logins OK: Rajesh (${rDeals?.length} deal: ${rDeals?.[0]?.state}) & Vikramjeet (${vDeals?.length} deal: ${vDeals?.[0]?.state})`);
  } catch (e) {
    record(14, false, `Demo accounts login failed: ${e.message}`);
  }

  // UPI Steps 1-9 (§5)
  await runUpiSmoke({ rpc, record, randPhone, uniqueTag, seedPhoto, userB });

  // Step 11: Second deal: lock then RAISE_DISPUTE with 1 check -> wait 91 s -> m_resolve_if_due -> ARBITRATED_SPLIT 30/70
  try {
    const listing2 = await rpc('m_create_listing', {
      p_token: userA.token,
      p_data: {
        title: `mechanical keyboard ${uniqueTag}`, description: 'hot-swappable keyboard for freeze split test',
        category: 'electronics', condition: 'good', kind: 'sell',
        price_minor: 10000, photos: [seedPhoto], meetup_spot: 'lobby', campus: 'MIT',
      },
    });
    let deal2 = await rpc('m_start_deal', { p_token: userB.token, p_listing_id: listing2.id, p_amount_minor: 10000 });
    deal2 = await rpc('m_deal_action', { p_token: userB.token, p_deal_id: deal2.id, p_action: 'LOCK_ESCROW', p_expected_version: deal2.version, p_payload: {} });
    const wSellerPreSplit = (await rpc('m_wallet', { p_token: userA.token })).balance_minor;
    const wBuyerPreSplit = (await rpc('m_wallet', { p_token: userB.token })).balance_minor;
    deal2 = await rpc('m_deal_action', { p_token: userA.token, p_deal_id: deal2.id, p_action: 'START_ASSAY', p_expected_version: deal2.version, p_payload: {} });
    deal2 = await rpc('m_deal_action', { p_token: userA.token, p_deal_id: deal2.id, p_action: 'CHECK_ITEM', p_expected_version: deal2.version, p_payload: { index: 0, photo_url: seedPhoto } });
    deal2 = await rpc('m_deal_action', { p_token: userB.token, p_deal_id: deal2.id, p_action: 'RAISE_DISPUTE', p_expected_version: deal2.version, p_payload: { reason: 'only one check shown' } });
    deal2 = await rpc('m_deal_action', { p_token: userB.token, p_deal_id: deal2.id, p_action: 'ADD_STATEMENT', p_expected_version: deal2.version, p_payload: { text: 'seller only sent 1 photo out of 3' } });

    console.log('Waiting 91s for freeze resolution timer to mature...');
    await new Promise((r) => setTimeout(r, 91000));

    const resolved = await rpc('m_resolve_if_due', { p_token: userB.token, p_deal_id: deal2.id });
    const sellerGain = (await rpc('m_wallet', { p_token: userA.token })).balance_minor - wSellerPreSplit;
    const buyerGain = (await rpc('m_wallet', { p_token: userB.token })).balance_minor - wBuyerPreSplit;
    const ok = resolved.state === 'ARBITRATED_SPLIT' && resolved.verdict?.seller_pct === 30 && resolved.verdict?.buyer_pct === 70 && sellerGain === 3000 && buyerGain === 7000;
    record(11, ok, `90s Freeze Resolution -> state=${resolved.state}, split=${resolved.verdict?.seller_pct}/${resolved.verdict?.buyer_pct}, seller +${sellerGain}, buyer +${buyerGain}`);
  } catch (e) {
    record(11, false, `Freeze resolution test failed: ${e.message}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSmoke Summary: ${results.length - failed.length}/${results.length} passed.`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Unhandled smoke error:', err);
  process.exit(1);
});

import pg from 'pg';

export async function runUpiSmoke({ rpc, record, randPhone, uniqueTag, seedPhoto, userB }) {
  let pgClient = null;
  const rawDbUrl = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]*/g, '');
  if (rawDbUrl) {
    try {
      pgClient = new pg.Client({ connectionString: rawDbUrl, ssl: { rejectUnauthorized: false } });
      await pgClient.connect();
    } catch {
      try {
        const u = new URL(rawDbUrl);
        const refMatch = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
        if (refMatch) {
          u.hostname = 'aws-1-ap-south-1.pooler.supabase.com';
          u.username = `postgres.${refMatch[1]}`;
          u.port = '5432';
          pgClient = new pg.Client({ connectionString: u.toString(), ssl: { rejectUnauthorized: false } });
          await pgClient.connect();
        }
      } catch {
        pgClient = null;
      }
    }
  }

  async function latestVoucher(dealId) {
    if (!pgClient) return null;
    const { rows } = await pgClient.query(
      `select event, payload from mudra.vouchers where deal_id = $1 order by id desc limit 1`,
      [dealId]
    );
    return rows[0] || null;
  }

  // 1. INR buyer + seller; seller lists ₹950; buyer starts deal at full price -> CREATED
  let inrSeller, inrBuyer, inrListing, inrDeal;
  try {
    inrSeller = await rpc('m_signup', {
      p_name: 'Priya INR Seller', p_phone: randPhone(), p_pin: '2468',
      p_role: 'sell', p_locale: 'en', p_currency: 'INR', p_campus: 'IIT Bombay',
    });
    inrBuyer = await rpc('m_signup', {
      p_name: 'Rohan INR Buyer', p_phone: randPhone(), p_pin: '1357',
      p_role: 'buy', p_locale: 'en', p_currency: 'INR', p_campus: 'IIT Bombay',
    });
    inrListing = await rpc('m_create_listing', {
      p_token: inrSeller.token,
      p_data: {
        title: `casio calculator ${uniqueTag}`, description: 'fx-991ex for upi smoke test',
        category: 'electronics', condition: 'like_new', kind: 'sell',
        price_minor: 95000, photos: [seedPhoto], meetup_spot: 'library gate', campus: 'IIT Bombay',
      },
    });
    inrDeal = await rpc('m_start_deal', {
      p_token: inrBuyer.token, p_listing_id: inrListing.id, p_amount_minor: 95000,
    });
    record(
      'UPI-1',
      inrDeal?.state === 'CREATED' && inrDeal?.amount_minor === 95000 && inrDeal?.currency === 'INR',
      `INR deal started at full price ₹950 -> state=${inrDeal?.state}`
    );
  } catch (e) {
    record('UPI-1', false, `UPI-1 failed: ${e.message}`);
  }

  const utrBase = String(Date.now()).slice(-10).padStart(10, '0');
  const utrDeal = `91${utrBase}`;
  const utrWrongAmt = `92${utrBase}`;
  const utrWallet = `93${utrBase}`;

  // 5. Amount != deal amount -> VALIDATION, and no ledger row was written (rollback works)
  try {
    const wBefore = await rpc('m_wallet', { p_token: inrBuyer.token });
    const txCountBefore = (wBefore.transactions || []).length;
    let errMsg = '';
    try {
      await rpc('m_record_upi_deposit', {
        p_token: inrBuyer.token, p_amount_minor: 90000, p_utr: utrWrongAmt,
        p_deal_id: inrDeal.id, p_expected_version: inrDeal.version,
      });
    } catch (err) {
      errMsg = String(err.message);
    }
    const wAfter = await rpc('m_wallet', { p_token: inrBuyer.token });
    const txCountAfter = (wAfter.transactions || []).length;
    record('UPI-5', errMsg.includes('MUDRA:VALIDATION') && txCountAfter === txCountBefore,
      `Amount != deal amount rejected (${errMsg}) and ledger unchanged (${txCountBefore} -> ${txCountAfter})`);
  } catch (e) {
    record('UPI-5', false, `UPI-5 failed: ${e.message}`);
  }

  // 2. m_record_upi_deposit(950_00, utr, deal, version) -> state FUNDED; wallet balance unchanged;
  // ledger has upi_deposit (+, unverified, utr) then escrow_lock (-); latest voucher ESCROW_LOCKED has method='upi' and utr
  let txCountAfterUpiLock = 0;
  try {
    const wBefore = await rpc('m_wallet', { p_token: inrBuyer.token });
    const updatedDeal = await rpc('m_record_upi_deposit', {
      p_token: inrBuyer.token, p_amount_minor: 95000, p_utr: utrDeal,
      p_deal_id: inrDeal.id, p_expected_version: inrDeal.version, p_idem: `idem-upi-${uniqueTag}`,
    });
    const wAfter = await rpc('m_wallet', { p_token: inrBuyer.token });
    const txs = wAfter.transactions || [];
    txCountAfterUpiLock = txs.length;
    const lockTx = txs[0];
    const depTx = txs[1];
    const msgs = await rpc('m_messages', { p_token: inrBuyer.token, p_deal_id: inrDeal.id });
    const escrowMsg = [...(msgs || [])].reverse().find((m) => m.kind === 'escrow');
    const voucher = await latestVoucher(inrDeal.id);
    const vMethod = voucher ? voucher.payload?.method : escrowMsg?.payload?.method;
    const vUtr = voucher ? voucher.payload?.utr : escrowMsg?.payload?.utr;

    const ok =
      updatedDeal?.state === 'FUNDED' &&
      wAfter.balance_minor === wBefore.balance_minor &&
      depTx?.kind === 'upi_deposit' && depTx?.amount_minor === 95000 &&
      depTx?.status === 'unverified' && depTx?.utr === utrDeal &&
      lockTx?.kind === 'escrow_lock' && lockTx?.amount_minor === -95000 &&
      vMethod === 'upi' && vUtr === utrDeal;
    record('UPI-2', ok,
      `UPI deal lock -> state=${updatedDeal?.state}, bal=${wBefore.balance_minor}->${wAfter.balance_minor}, dep=${depTx?.kind}/${depTx?.status}/${depTx?.utr}, lock=${lockTx?.kind}, voucher method=${vMethod} utr=${vUtr}`);
  } catch (e) {
    record('UPI-2', false, `UPI-2 failed: ${e.message}`);
  }

  // 3. Same call again with the same UTR and deal -> returns the deal, no new ledger rows
  try {
    const retryDeal = await rpc('m_record_upi_deposit', {
      p_token: inrBuyer.token, p_amount_minor: 95000, p_utr: utrDeal,
      p_deal_id: inrDeal.id, p_expected_version: inrDeal.version,
    });
    const wRetry = await rpc('m_wallet', { p_token: inrBuyer.token });
    const ok = retryDeal?.id === inrDeal.id && retryDeal?.state === 'FUNDED' &&
      (wRetry.transactions || []).length === txCountAfterUpiLock;
    record('UPI-3', ok, `Idempotent UTR retry -> state=${retryDeal?.state}, tx count unchanged (${txCountAfterUpiLock})`);
  } catch (e) {
    record('UPI-3', false, `UPI-3 failed: ${e.message}`);
  }

  // 4. Same UTR from another user -> UTR_USED
  try {
    let errMsg = '';
    try {
      await rpc('m_record_upi_deposit', { p_token: inrSeller.token, p_amount_minor: 95000, p_utr: utrDeal });
    } catch (err) {
      errMsg = String(err.message);
    }
    record('UPI-4', errMsg.includes('MUDRA:UTR_USED'), `Duplicate UTR by another user -> ${errMsg}`);
  } catch (e) {
    record('UPI-4', false, `UPI-4 failed: ${e.message}`);
  }

  // 6. Plain LOCK_ESCROW via m_deal_action with p_payload = {"utr":"..."} -> voucher method='wallet', utr null
  try {
    const listingSpoof = await rpc('m_create_listing', {
      p_token: inrSeller.token,
      p_data: {
        title: `spoof check book ${uniqueTag}`, description: 'testing utr spoofing block',
        category: 'books', condition: 'good', kind: 'sell',
        price_minor: 50000, photos: [seedPhoto], meetup_spot: 'hostel 4', campus: 'IIT Bombay',
      },
    });
    let dealSpoof = await rpc('m_start_deal', {
      p_token: inrBuyer.token, p_listing_id: listingSpoof.id, p_amount_minor: 50000,
    });
    dealSpoof = await rpc('m_deal_action', {
      p_token: inrBuyer.token, p_deal_id: dealSpoof.id, p_action: 'LOCK_ESCROW',
      p_expected_version: dealSpoof.version, p_payload: { utr: '999999999999', method: 'upi' },
    });
    const msgs = await rpc('m_messages', { p_token: inrBuyer.token, p_deal_id: dealSpoof.id });
    const escrowMsg = [...(msgs || [])].reverse().find((m) => m.kind === 'escrow');
    const voucher = await latestVoucher(dealSpoof.id);
    const vMethod = voucher ? voucher.payload?.method : escrowMsg?.payload?.method;
    const vUtr = voucher ? voucher.payload?.utr : escrowMsg?.payload?.utr;
    record('UPI-6', dealSpoof.state === 'FUNDED' && vMethod === 'wallet' && vUtr === null,
      `Plain LOCK_ESCROW with spoofed payload -> voucher method=${vMethod}, utr=${vUtr}`);
  } catch (e) {
    record('UPI-6', false, `UPI-6 failed: ${e.message}`);
  }

  // 7. Wallet deposit without deal -> balance +amount
  try {
    const wBefore = await rpc('m_wallet', { p_token: inrBuyer.token });
    const wAfter = await rpc('m_record_upi_deposit', {
      p_token: inrBuyer.token, p_amount_minor: 100000, p_utr: utrWallet,
    });
    const latestTx = (wAfter.transactions || [])[0];
    const ok = wAfter.balance_minor - wBefore.balance_minor === 100000 &&
      latestTx?.kind === 'upi_deposit' && latestTx?.status === 'unverified' && latestTx?.utr === utrWallet;
    record('UPI-7', ok, `Wallet UPI deposit +100000 -> balance ${wBefore.balance_minor} -> ${wAfter.balance_minor} (${latestTx?.status})`);
  } catch (e) {
    record('UPI-7', false, `UPI-7 failed: ${e.message}`);
  }

  // 8. m_withdraw_upi checks
  try {
    let badUpiErr = '';
    try {
      await rpc('m_withdraw_upi', { p_token: inrBuyer.token, p_amount_minor: 10000, p_upi_id: 'not-a-upi-id' });
    } catch (err) {
      badUpiErr = String(err.message);
    }
    const wCur = await rpc('m_wallet', { p_token: inrBuyer.token });
    let insuffErr = '';
    try {
      await rpc('m_withdraw_upi', {
        p_token: inrBuyer.token, p_amount_minor: Math.min(10000000, wCur.balance_minor + 50000), p_upi_id: 'rohan@okaxis',
      });
    } catch (err) {
      insuffErr = String(err.message);
    }
    const wAfter1 = await rpc('m_withdraw_upi', {
      p_token: inrBuyer.token, p_amount_minor: 10000, p_upi_id: 'Rohan.User@okaxis',
    });
    const tx1 = (wAfter1.transactions || [])[0];
    const meAfter1 = await rpc('m_me', { p_token: inrBuyer.token });
    for (let i = 2; i <= 5; i++) {
      await rpc('m_withdraw_upi', { p_token: inrBuyer.token, p_amount_minor: 10000, p_upi_id: 'rohan.user@okaxis' });
    }
    let rateErr = '';
    try {
      await rpc('m_withdraw_upi', { p_token: inrBuyer.token, p_amount_minor: 10000, p_upi_id: 'rohan.user@okaxis' });
    } catch (err) {
      rateErr = String(err.message);
    }
    const ok = badUpiErr.includes('MUDRA:VALIDATION') && insuffErr.includes('MUDRA:INSUFFICIENT_FUNDS') &&
      wCur.balance_minor - wAfter1.balance_minor === 10000 && tx1?.kind === 'upi_withdraw' &&
      tx1?.status === 'requested' && tx1?.upi_id === 'rohan.user@okaxis' &&
      meAfter1?.upi_id === 'rohan.user@okaxis' && rateErr.includes('MUDRA:RATE_LIMIT');
    record('UPI-8', ok,
      `Withdraw checks: badUpi=${badUpiErr.includes('VALIDATION')}, insuff=${insuffErr.includes('INSUFFICIENT_FUNDS')}, tx=${tx1?.status}/${tx1?.upi_id}, me.upi_id=${meAfter1?.upi_id}, 6th=${rateErr}`);
  } catch (e) {
    record('UPI-8', false, `UPI-8 failed: ${e.message}`);
  }

  // 9. USD user -> deposit/withdraw -> VALIDATION
  try {
    let depErr = '', wdErr = '';
    try {
      await rpc('m_record_upi_deposit', { p_token: userB.token, p_amount_minor: 10000, p_utr: `94${utrBase}` });
    } catch (err) { depErr = String(err.message); }
    try {
      await rpc('m_withdraw_upi', { p_token: userB.token, p_amount_minor: 1000, p_upi_id: 'bob@okaxis' });
    } catch (err) { wdErr = String(err.message); }
    record('UPI-9', depErr.includes('MUDRA:VALIDATION') && wdErr.includes('MUDRA:VALIDATION'),
      `USD user deposit (${depErr}) & withdraw (${wdErr}) rejected with VALIDATION`);
  } catch (e) {
    record('UPI-9', false, `UPI-9 failed: ${e.message}`);
  }

  if (pgClient) await pgClient.end().catch(() => {});
}

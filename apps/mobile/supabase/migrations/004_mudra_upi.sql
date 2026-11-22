-- 004_mudra_upi.sql
-- MUDRA Android — UPI Deep Link + Escrow Wallet + UPI Cashout (§1)

-- ============================================================================
-- 1.1 Schema
-- ============================================================================
alter table mudra.profiles add column if not exists upi_id text;
alter table mudra.profiles drop constraint if exists profiles_upi_id_check;
alter table mudra.profiles add constraint profiles_upi_id_check
  check (upi_id is null or upi_id ~ '^[a-zA-Z0-9.\-_]{2,255}@[a-zA-Z]{2,64}$');

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

-- ============================================================================
-- 1.2 New RPCs
-- ============================================================================

create or replace function public.m_record_upi_deposit(
  p_token text,
  p_amount_minor bigint,
  p_utr text,
  p_deal_id uuid default null,
  p_expected_version int default null,
  p_idem text default null
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_utr text;
  v_existing mudra.wallet_tx;
  v_deal mudra.deals;
  v_res jsonb;
begin
  -- 1. auth
  v_me := mudra.auth(p_token);

  -- 2. validate UTR (12 digits)
  v_utr := btrim(coalesce(p_utr, ''));
  if v_utr !~ '^\d{12}$' then
    raise exception 'MUDRA:VALIDATION:utr must be 12 digits';
  end if;

  -- 3. INR only
  if v_me.currency <> 'INR' then
    raise exception 'MUDRA:VALIDATION:upi works only for INR wallets';
  end if;

  -- 4. amount between ₹1 and ₹1,00,000 (100 to 10,000,000 paise)
  if p_amount_minor is null or p_amount_minor < 100 or p_amount_minor > 10000000 then
    raise exception 'MUDRA:VALIDATION:amount must be between ₹1 and ₹1,00,000';
  end if;

  -- 5. replay check
  select * into v_existing
    from mudra.wallet_tx
   where kind = 'upi_deposit'
     and utr = v_utr
   limit 1;

  if found then
    if v_existing.profile_id = v_me.id and v_existing.deal_id is not distinct from p_deal_id then
      if p_deal_id is not null then
        return public.m_deal(p_token, p_deal_id);
      else
        return public.m_wallet(p_token);
      end if;
    else
      raise exception 'MUDRA:UTR_USED:this utr was already used';
    end if;
  end if;

  -- 6. deal pre-checks before crediting
  if p_deal_id is not null then
    select * into v_deal
      from mudra.deals
     where id = p_deal_id
     for update;

    if not found then
      raise exception 'MUDRA:NOT_FOUND:deal not found';
    end if;
    if v_me.id <> v_deal.buyer_id then
      raise exception 'MUDRA:FORBIDDEN:only the buyer can pay';
    end if;
    if v_deal.state <> 'CREATED' then
      raise exception 'MUDRA:BAD_STATE:%', v_deal.state;
    end if;
    if v_deal.currency <> 'INR' then
      raise exception 'MUDRA:VALIDATION:upi works only for INR wallets';
    end if;
    if p_amount_minor <> v_deal.amount_minor then
      raise exception 'MUDRA:VALIDATION:amount must equal the deal amount';
    end if;
  end if;

  -- 7. credit wallet and tag with utr + unverified
  perform mudra.wallet_move(v_me.id, 'INR', p_amount_minor, 'upi_deposit', p_deal_id, 'upi deposit');
  update mudra.wallet_tx
     set utr = v_utr,
         status = 'unverified'
   where id = (select max(id) from mudra.wallet_tx where profile_id = v_me.id);

  -- 8. wallet-only deposit
  if p_deal_id is null then
    return public.m_wallet(p_token);
  end if;

  -- 9. deal escrow lock in the same transaction
  perform set_config('mudra.upi_utr', v_utr, true);
  v_res := public.m_deal_action(
    p_token,
    p_deal_id,
    'LOCK_ESCROW',
    coalesce(p_expected_version, v_deal.version),
    '{}'::jsonb,
    p_idem
  );
  perform set_config('mudra.upi_utr', '', true);
  return v_res;
end $$;

create or replace function public.m_withdraw_upi(
  p_token text,
  p_amount_minor bigint,
  p_upi_id text
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_upi text;
  v_today int;
begin
  -- 1. auth & validation
  v_me := mudra.auth(p_token);
  if v_me.currency <> 'INR' then
    raise exception 'MUDRA:VALIDATION:upi works only for INR wallets';
  end if;

  v_upi := lower(btrim(coalesce(p_upi_id, '')));
  if v_upi !~ '^[a-zA-Z0-9.\-_]{2,255}@[a-zA-Z]{2,64}$' then
    raise exception 'MUDRA:VALIDATION:invalid upi id';
  end if;

  if p_amount_minor is null or p_amount_minor < 100 or p_amount_minor > 10000000 then
    raise exception 'MUDRA:VALIDATION:amount must be between ₹1 and ₹1,00,000';
  end if;

  -- 2. save default upi_id on profile
  update mudra.profiles
     set upi_id = v_upi
   where id = v_me.id;

  -- 3. debit wallet and tag row
  perform mudra.wallet_move(
    v_me.id,
    'INR',
    -p_amount_minor,
    'upi_withdraw',
    null,
    'withdraw to ' || v_upi
  );
  update mudra.wallet_tx
     set upi_id = v_upi,
         status = 'requested'
   where id = (select max(id) from mudra.wallet_tx where profile_id = v_me.id);

  -- 4. limit: max 5 withdrawals per day per user
  select count(*) into v_today
    from mudra.wallet_tx
   where profile_id = v_me.id
     and kind = 'upi_withdraw'
     and created_at >= current_date;

  if v_today > 5 then
    raise exception 'MUDRA:RATE_LIMIT:max 5 withdrawals per day';
  end if;

  -- 5. return updated wallet
  return public.m_wallet(p_token);
end $$;

create or replace function public.m_set_upi_id(
  p_token text,
  p_upi_id text
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_upi text;
begin
  v_me := mudra.auth(p_token);
  v_upi := nullif(lower(btrim(coalesce(p_upi_id, ''))), '');

  if v_upi is not null and v_upi !~ '^[a-zA-Z0-9.\-_]{2,255}@[a-zA-Z]{2,64}$' then
    raise exception 'MUDRA:VALIDATION:invalid upi id';
  end if;

  update mudra.profiles
     set upi_id = v_upi
   where id = v_me.id;

  return public.m_me(p_token);
end $$;

grant execute on function public.m_record_upi_deposit(text, bigint, text, uuid, int, text) to anon, authenticated;
grant execute on function public.m_withdraw_upi(text, bigint, text) to anon, authenticated;
grant execute on function public.m_set_upi_id(text, text) to anon, authenticated;

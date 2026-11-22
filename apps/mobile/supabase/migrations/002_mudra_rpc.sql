-- 002_mudra_rpc.sql
-- MUDRA Public RPCs (§8.3–§8.8, ADR-M8)

do $$
begin
  create extension if not exists http with schema extensions;
exception when others then
  raise notice 'http extension not available: %', sqlerrm;
end $$;

-- ============================================================================
-- Internal helper: mudra.me_json
-- ============================================================================
create or replace function mudra.me_json(p_prof mudra.profiles) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_bal bigint := 0;
  v_wallets jsonb := '[]'::jsonb;
  v_active_listings int := 0;
  v_offers_waiting int := 0;
  v_earned_minor bigint := 0;
  v_needs_you int := 0;
  v_unread int := 0;
  v_rating numeric := null;
begin
  select coalesce(balance_minor, 0) into v_bal
    from mudra.wallets
   where profile_id = p_prof.id and currency = p_prof.currency;

  select coalesce(jsonb_agg(jsonb_build_object(
    'currency', w.currency,
    'balance_minor', w.balance_minor,
    'topups_today', case when w.topup_day = current_date then w.topups_today else 0 end
  )), '[]'::jsonb) into v_wallets
    from mudra.wallets w
   where w.profile_id = p_prof.id;

  select count(*) into v_active_listings
    from mudra.listings
   where seller_id = p_prof.id and status = 'active';

  select count(*) into v_offers_waiting
    from mudra.deals
   where seller_id = p_prof.id
     and state = 'OFFERED'
     and offer_by <> p_prof.id;

  select coalesce(sum(amount_minor), 0) into v_earned_minor
    from mudra.wallet_tx
   where profile_id = p_prof.id
     and currency = p_prof.currency
     and kind in ('escrow_release', 'split')
     and amount_minor > 0;

  select count(*) into v_needs_you
    from mudra.deals d
   where (d.buyer_id = p_prof.id or d.seller_id = p_prof.id)
     and d.state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')
     and (
       (d.state = 'OFFERED' and d.offer_by <> p_prof.id) or
       (d.state = 'CREATED' and d.buyer_id = p_prof.id) or
       (d.state = 'FUNDED' and (d.seller_id = p_prof.id or (d.buyer_id = p_prof.id and d.inspection_mode = 'in_person'))) or
       (d.state = 'INSPECTION_LIVE') or
       (d.state = 'ASSAY_VERIFIED' and d.buyer_id = p_prof.id) or
       (d.state = 'DISPUTED_FROZEN')
     );

  select coalesce(sum(case when d.buyer_id = p_prof.id then d.buyer_unread else d.seller_unread end), 0)
    into v_unread
    from mudra.deals d
   where d.buyer_id = p_prof.id or d.seller_id = p_prof.id;

  if p_prof.rating_count > 0 then
    v_rating := round(p_prof.rating_sum::numeric / p_prof.rating_count::numeric, 1);
  end if;

  return jsonb_build_object(
    'id', p_prof.id,
    'name', p_prof.name,
    'phone_e164', p_prof.phone_e164,
    'primary_role', p_prof.primary_role,
    'locale', p_prof.locale,
    'currency', p_prof.currency,
    'campus', p_prof.campus,
    'bio', p_prof.bio,
    'upi_id', p_prof.upi_id,
    'avatar_hue', p_prof.avatar_hue,
    'rating', v_rating,
    'rating_count', p_prof.rating_count,
    'deals_done', p_prof.deals_done,
    'is_demo_bot', p_prof.is_demo_bot,
    'is_demo_account', p_prof.is_demo_account,
    'wallet_balance_minor', coalesce(v_bal, 0),
    'wallets', v_wallets,
    'counts', jsonb_build_object(
      'active_listings', v_active_listings,
      'offers_waiting', v_offers_waiting,
      'earned_minor', v_earned_minor,
      'needs_you', v_needs_you,
      'unread', v_unread
    ),
    'server_now', now(),
    'created_at', p_prof.created_at
  );
end $$;

-- ============================================================================
-- Internal helper: mudra.seed_demo_for (§8.7)
-- ============================================================================
create or replace function mudra.seed_demo_for(p_profile_id uuid) returns void
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_prof mudra.profiles;
  v_priya mudra.profiles;
  v_aarav mudra.profiles;
  v_calc_listing mudra.listings;
  v_cycle_listing mudra.listings;
  v_deal mudra.deals;
  v_short text;
  v_vhash text;
  v_calc_photo text;
  v_cycle_photo text;
begin
  select * into v_prof from mudra.profiles where id = p_profile_id;
  if not found then
    return;
  end if;

  -- Allow deleting vouchers for demo reset
  perform set_config('mudra.allow_reset', '1', true);

  -- Clean up existing deals involving this demo user
  delete from mudra.deals where buyer_id = v_prof.id or seller_id = v_prof.id;

  -- Clean up listings created by this demo user
  delete from mudra.listings where seller_id = v_prof.id;

  -- Reset wallet to signup bonus
  delete from mudra.wallet_tx where profile_id = v_prof.id;
  delete from mudra.wallets where profile_id = v_prof.id;
  perform mudra.wallet_move(
    v_prof.id,
    v_prof.currency,
    mudra.signup_bonus_for(v_prof.currency),
    'signup_bonus',
    null,
    'welcome demo credits'
  );

  select * into v_priya from mudra.profiles where phone_e164 = '+919000000011' limit 1;
  select * into v_aarav from mudra.profiles where phone_e164 = '+919000000012' limit 1;

  -- Pick a photo URL already in listings (or fallback to a valid storage/seed path)
  select photos[1] into v_calc_photo from mudra.listings where category in ('electronics','books','home') limit 1;
  if v_calc_photo is null then
    v_calc_photo := 'https://ttpgogzqispnexpktrsv.supabase.co/storage/v1/object/public/mudra-photos/seed/1550009158-9ebf69173e03.jpg';
  end if;

  select photos[1] into v_cycle_photo from mudra.listings where category = 'rides' limit 1;
  if v_cycle_photo is null then
    v_cycle_photo := 'https://ttpgogzqispnexpktrsv.supabase.co/storage/v1/object/public/mudra-photos/seed/1532298229144-0ec0c57515c7.jpg';
  end if;

  if v_prof.phone_e164 = '+919000000001' and v_priya.id is not null then
    -- Rajesh Natarajan (buyer): CREATED deal with Priya Nair for "casio fx-991ex calculator" ₹950
    select * into v_calc_listing
      from mudra.listings
     where seller_id = v_priya.id
       and lower(title) = 'casio fx-991ex calculator'
     limit 1;

    if not found then
      insert into mudra.listings(
        id, seller_id, title, description, category, condition, kind,
        price_minor, currency, photos, meetup_spot, campus, status
      ) values (
        '00000000-0000-4000-8000-000000000101'::uuid,
        v_priya.id,
        'casio fx-991ex calculator',
        'non-programmable scientific calculator allowed in all engineering exams. solar + battery works great.',
        'electronics',
        'like_new',
        'sell',
        95000,
        'INR',
        array[v_calc_photo],
        'central library gate',
        'IIT Bombay',
        'active'
      )
      on conflict (id) do update
        set status = 'active', price_minor = 95000, seller_id = v_priya.id
      returning * into v_calc_listing;
    else
      update mudra.listings set status = 'active', price_minor = 95000 where id = v_calc_listing.id returning * into v_calc_listing;
    end if;

    v_short := 'MD-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('mudra.deal_seq')::text, 4, '0');
    insert into mudra.deals(
      short_code, listing_id, buyer_id, seller_id, kind, amount_minor, currency,
      state, version, offer_by, buyer_unread, seller_unread
    ) values (
      v_short, v_calc_listing.id, v_prof.id, v_priya.id, 'sell', 95000, 'INR',
      'CREATED', 1, v_prof.id, 1, 0
    ) returning * into v_deal;

    v_vhash := mudra.voucher(v_deal.id, 'DEAL_STARTED', jsonb_build_object('buyer_id', v_prof.id, 'seller_id', v_priya.id, 'amount_minor', 95000));
    insert into mudra.messages(deal_id, sender_id, kind, body, lang)
    values (v_deal.id, v_priya.id, 'text', 'hey rajesh! yes the calculator is ready. lock the escrow whenever you are ready and i will show it live.', 'en');

  elsif v_prof.phone_e164 = '+919000000002' and v_aarav.id is not null then
    -- Vikramjeet Singh (seller): listing "hercules roadeo cycle" ₹6,500 with OFFERED deal from Aarav Mehta at ₹5,500
    insert into mudra.listings(
      id, seller_id, title, description, category, condition, kind,
      price_minor, currency, photos, meetup_spot, campus, status
    ) values (
      '00000000-0000-4000-8000-000000000102'::uuid,
      v_prof.id,
      'hercules roadeo cycle',
      '21-speed geared campus cycle with front suspension and disc brakes. serviced last month.',
      'rides',
      'good',
      'sell',
      650000,
      'INR',
      array[v_cycle_photo],
      'hostel 4 lobby',
      'IIT Bombay',
      'active'
    )
    on conflict (id) do update
      set seller_id = v_prof.id, status = 'active', price_minor = 650000
    returning * into v_cycle_listing;

    v_short := 'MD-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('mudra.deal_seq')::text, 4, '0');
    insert into mudra.deals(
      short_code, listing_id, buyer_id, seller_id, kind, amount_minor, currency,
      state, version, offer_by, buyer_unread, seller_unread
    ) values (
      v_short, v_cycle_listing.id, v_aarav.id, v_prof.id, 'sell', 550000, 'INR',
      'OFFERED', 1, v_aarav.id, 0, 1
    ) returning * into v_deal;

    v_vhash := mudra.voucher(v_deal.id, 'DEAL_STARTED', jsonb_build_object('buyer_id', v_aarav.id, 'seller_id', v_prof.id, 'amount_minor', 550000));
    insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
    values (
      v_deal.id,
      v_aarav.id,
      'offer',
      'offered ₹5,500 — can pick up today near hostel 4',
      jsonb_build_object('amount_minor', 550000, 'currency', 'INR', 'kind', 'sell'),
      'en'
    );
  end if;
end $$;

-- ============================================================================
-- 1. m_ping
-- ============================================================================
create or replace function public.m_ping() returns jsonb
language sql stable security definer set search_path = mudra, public, extensions as $$
  select jsonb_build_object('ok', true, 'server_now', now());
$$;

-- ============================================================================
-- 2. m_signup
-- ============================================================================
create or replace function public.m_signup(
  p_name text,
  p_phone text,
  p_pin text,
  p_role text default 'both',
  p_locale text default 'en',
  p_currency text default 'INR',
  p_campus text default null,
  p_token text default null
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := regexp_replace(btrim(coalesce(p_phone, '')), '[\s\-()]', '', 'g');
  v_pin text := btrim(coalesce(p_pin, ''));
  v_role text := lower(coalesce(p_role, 'both'));
  v_locale text := lower(coalesce(p_locale, 'en'));
  v_currency text := upper(coalesce(p_currency, 'INR'));
  v_campus text := nullif(btrim(coalesce(p_campus, '')), '');
  v_prof mudra.profiles;
  v_tok text;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'MUDRA:VALIDATION:name must be between 2 and 40 characters';
  end if;
  if v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'MUDRA:VALIDATION:invalid phone number format';
  end if;
  if v_pin !~ '^\d{4}$' then
    raise exception 'MUDRA:VALIDATION:pin must be 4 digits';
  end if;
  if v_role not in ('buy','sell','both') then
    v_role := 'both';
  end if;
  if v_locale not in ('en','hi','ta','mr','es') then
    v_locale := 'en';
  end if;
  if v_currency not in ('INR','USD','EUR','GBP','SGD','AED','CAD','AUD') then
    v_currency := 'INR';
  end if;

  if exists (select 1 from mudra.profiles where phone_e164 = v_phone and deleted_at is null) then
    raise exception 'MUDRA:PHONE_TAKEN:this phone number already has an account';
  end if;

  insert into mudra.profiles(
    name, phone_e164, pin_hash, primary_role, locale, currency, campus
  ) values (
    v_name,
    v_phone,
    extensions.crypt(v_pin, extensions.gen_salt('bf', 8)),
    v_role,
    v_locale,
    v_currency,
    left(v_campus, 60)
  ) returning * into v_prof;

  perform mudra.wallet_move(
    v_prof.id,
    v_prof.currency,
    mudra.signup_bonus_for(v_prof.currency),
    'signup_bonus',
    null,
    'welcome demo credits'
  );

  v_tok := mudra.new_token();
  insert into mudra.sessions(token_hash, profile_id)
  values (encode(extensions.digest(v_tok, 'sha256'), 'hex'), v_prof.id);

  return jsonb_build_object(
    'token', v_tok,
    'me', mudra.me_json(v_prof)
  );
end $$;

-- ============================================================================
-- 3. m_login
-- ============================================================================
create or replace function public.m_login(
  p_phone text,
  p_pin text,
  p_token text default null
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_phone text := regexp_replace(btrim(coalesce(p_phone, '')), '[\s\-()]', '', 'g');
  v_pin text := btrim(coalesce(p_pin, ''));
  v_prof mudra.profiles;
  v_slot text;
  v_raw bigint := 0;
  v_called boolean := false;
  v_attempts int := 0;
  v_lock_epoch bigint := 0;
  v_now_epoch bigint := extract(epoch from now())::bigint;
  v_mins int;
  v_tok text;
begin
  select * into v_prof
    from mudra.profiles
   where phone_e164 = v_phone
     and deleted_at is null;

  if not found then
    raise exception 'MUDRA:NOT_FOUND:no account with this number';
  end if;

  v_slot := 'mudra.pin_slot_' || (abs(hashtext(v_prof.phone_e164)) % 256)::text;
  execute format('select last_value, is_called from %s', v_slot) into v_raw, v_called;
  if not v_called then
    v_raw := 0;
  end if;

  v_attempts := (v_raw % 16)::int;
  v_lock_epoch := (v_raw / 16)::bigint;

  if v_prof.locked_until is not null and v_prof.locked_until > now() then
    v_mins := greatest(1, ceil(extract(epoch from (v_prof.locked_until - now())) / 60.0)::int);
    raise exception 'MUDRA:LOCKED:%', v_mins;
  end if;

  if v_lock_epoch > v_now_epoch then
    v_mins := greatest(1, ceil((v_lock_epoch - v_now_epoch)::numeric / 60.0)::int);
    raise exception 'MUDRA:LOCKED:%', v_mins;
  elsif v_lock_epoch > 0 and v_lock_epoch <= v_now_epoch then
    v_attempts := 0;
    v_lock_epoch := 0;
  end if;

  if v_prof.pin_hash <> extensions.crypt(v_pin, v_prof.pin_hash) then
    v_attempts := v_attempts + 1;
    if v_attempts >= 5 then
      v_lock_epoch := v_now_epoch + 300;
      perform setval(v_slot, v_lock_epoch * 16 + v_attempts, true);
      raise exception 'MUDRA:LOCKED:5';
    else
      perform setval(v_slot, v_attempts, true);
      raise exception 'MUDRA:BAD_PIN:%', (5 - v_attempts);
    end if;
  end if;

  -- Successful login: reset slot & table fields
  perform setval(v_slot, 1, false);
  update mudra.profiles
     set failed_pin_attempts = 0,
         locked_until = null
   where id = v_prof.id;

  v_tok := mudra.new_token();
  insert into mudra.sessions(token_hash, profile_id)
  values (encode(extensions.digest(v_tok, 'sha256'), 'hex'), v_prof.id);

  return jsonb_build_object(
    'token', v_tok,
    'me', mudra.me_json(v_prof)
  );
end $$;

-- ============================================================================
-- 4. m_logout
-- ============================================================================
create or replace function public.m_logout(p_token text default null) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
begin
  if p_token is not null and btrim(p_token) <> '' then
    delete from mudra.sessions
     where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================
-- 5. m_me
-- ============================================================================
create or replace function public.m_me(p_token text) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_prof mudra.profiles;
begin
  v_prof := mudra.auth(p_token);
  return mudra.me_json(v_prof);
end $$;

-- ============================================================================
-- 6. m_update_profile
-- ============================================================================
create or replace function public.m_update_profile(p_token text, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_prof mudra.profiles;
  v_name text;
  v_campus text;
  v_bio text;
  v_locale text;
  v_currency text;
  v_role text;
begin
  v_prof := mudra.auth(p_token);

  v_name := coalesce(nullif(btrim(p_patch->>'name'), ''), v_prof.name);
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'MUDRA:VALIDATION:name must be 2 to 40 characters';
  end if;

  v_campus := case
    when p_patch ? 'campus' then left(nullif(btrim(p_patch->>'campus'), ''), 60)
    else v_prof.campus
  end;

  v_bio := case
    when p_patch ? 'bio' then left(nullif(btrim(p_patch->>'bio'), ''), 200)
    else v_prof.bio
  end;

  v_locale := lower(coalesce(nullif(btrim(p_patch->>'locale'), ''), v_prof.locale));
  if v_locale not in ('en','hi','ta','mr','es') then
    raise exception 'MUDRA:VALIDATION:unsupported locale';
  end if;

  v_currency := upper(coalesce(nullif(btrim(p_patch->>'currency'), ''), v_prof.currency));
  if v_currency not in ('INR','USD','EUR','GBP','SGD','AED','CAD','AUD') then
    raise exception 'MUDRA:VALIDATION:unsupported currency';
  end if;

  v_role := lower(coalesce(nullif(btrim(p_patch->>'primary_role'), ''), v_prof.primary_role));
  if v_role not in ('buy','sell','both') then
    raise exception 'MUDRA:VALIDATION:invalid role';
  end if;

  update mudra.profiles
     set name = v_name,
         campus = v_campus,
         bio = v_bio,
         locale = v_locale,
         currency = v_currency,
         primary_role = v_role
   where id = v_prof.id
   returning * into v_prof;

  insert into mudra.wallets(profile_id, currency, balance_minor)
  values (v_prof.id, v_prof.currency, 0)
  on conflict (profile_id, currency) do nothing;

  return mudra.me_json(v_prof);
end $$;

-- ============================================================================
-- 7. m_change_pin
-- ============================================================================
create or replace function public.m_change_pin(p_token text, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_prof mudra.profiles;
begin
  v_prof := mudra.auth(p_token);
  if v_prof.pin_hash <> extensions.crypt(coalesce(p_old, ''), v_prof.pin_hash) then
    raise exception 'MUDRA:BAD_PIN:current pin is incorrect';
  end if;
  if coalesce(p_new, '') !~ '^\d{4}$' then
    raise exception 'MUDRA:VALIDATION:new pin must be 4 digits';
  end if;

  update mudra.profiles
     set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 8))
   where id = v_prof.id;

  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================
-- 8. m_delete_account
-- ============================================================================
create or replace function public.m_delete_account(p_token text, p_pin text) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_prof mudra.profiles;
begin
  v_prof := mudra.auth(p_token);
  if v_prof.pin_hash <> extensions.crypt(coalesce(p_pin, ''), v_prof.pin_hash) then
    raise exception 'MUDRA:BAD_PIN:incorrect pin';
  end if;

  update mudra.listings
     set status = 'removed', updated_at = now()
   where seller_id = v_prof.id and status = 'active';

  update mudra.profiles
     set name = 'deleted user',
         phone_e164 = '+999' || lpad(floor(random() * 100000000000::numeric)::bigint::text, 11, '0'),
         bio = null,
         campus = null,
         deleted_at = now()
   where id = v_prof.id;

  delete from mudra.sessions where profile_id = v_prof.id;

  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================
-- 9. m_feed
-- ============================================================================
create or replace function public.m_feed(
  p_token text default null,
  p_filters jsonb default '{}'::jsonb,
  p_limit int default 20,
  p_offset int default 0
) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_q text := nullif(btrim(coalesce(p_filters->>'q', '')), '');
  v_cat text := nullif(lower(btrim(coalesce(p_filters->>'category', ''))), '');
  v_kind text := nullif(lower(btrim(coalesce(p_filters->>'kind', ''))), '');
  v_cond text := nullif(lower(btrim(coalesce(p_filters->>'condition', ''))), '');
  v_min bigint := case when p_filters ? 'min' and p_filters->>'min' is not null and p_filters->>'min' <> '' then (p_filters->>'min')::bigint else null end;
  v_max bigint := case when p_filters ? 'max' and p_filters->>'max' is not null and p_filters->>'max' <> '' then (p_filters->>'max')::bigint else null end;
  v_campus_only boolean := coalesce((p_filters->>'campus_only')::boolean, false);
  v_exclude_mine boolean := coalesce((p_filters->>'exclude_mine')::boolean, false);
  v_sort text := lower(coalesce(p_filters->>'sort', 'default'));
  v_lim int := least(greatest(coalesce(p_limit, 20), 1), 40);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_res jsonb;
begin
  v_me := mudra.auth_opt(p_token);
  if v_cat = 'all' then v_cat := null; end if;
  if v_kind = 'all' then v_kind := null; end if;
  if v_cond = 'all' then v_cond := null; end if;

  select coalesce(jsonb_agg(mudra.listing_card_json(t)), '[]'::jsonb)
    into v_res
    from (
      select l.*
        from mudra.listings l
       where l.status = 'active'
         and (v_q is null or l.search @@ plainto_tsquery('simple', v_q) or l.title operator(extensions.%) v_q or l.title ilike '%' || v_q || '%' or l.description ilike '%' || v_q || '%')
         and (
           v_cat is null
           or (v_cat = 'free_swap' and l.kind in ('free','swap'))
           or (v_cat <> 'free_swap' and l.category = v_cat)
         )
         and (v_kind is null or l.kind = v_kind)
         and (v_cond is null or l.condition = v_cond)
         and (v_min is null or l.price_minor >= v_min)
         and (v_max is null or l.price_minor <= v_max)
         and (not v_campus_only or v_me.campus is null or lower(l.campus) = lower(v_me.campus))
         and (not v_exclude_mine or v_me.id is null or l.seller_id <> v_me.id)
       order by
         case when v_sort = 'price_low' then l.price_minor end asc nulls last,
         case when v_sort = 'price_high' then l.price_minor end desc nulls last,
         case
           when v_sort not in ('price_low','price_high','newest')
                and v_me.campus is not null
                and l.campus is not null
                and lower(l.campus) = lower(v_me.campus)
           then 0 else 1
         end asc,
         l.created_at desc
       limit v_lim offset v_off
    ) t;

  return v_res;
end $$;

-- ============================================================================
-- 10. m_listing
-- ============================================================================
create or replace function public.m_listing(
  p_token text default null,
  p_listing_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_listing mudra.listings;
  v_saved boolean := false;
  v_open_deal uuid := null;
begin
  v_me := mudra.auth_opt(p_token);

  select * into v_listing
    from mudra.listings
   where id = p_listing_id;

  if not found then
    raise exception 'MUDRA:NOT_FOUND:listing not found';
  end if;

  if v_me.id is not null then
    select exists(
      select 1 from mudra.saves
       where profile_id = v_me.id and listing_id = v_listing.id
    ) into v_saved;

    select id into v_open_deal
      from mudra.deals
     where listing_id = v_listing.id
       and (buyer_id = v_me.id or seller_id = v_me.id)
       and state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')
     order by updated_at desc
     limit 1;
  end if;

  return mudra.listing_card_json(v_listing) || jsonb_build_object(
    'saved_by_me', v_saved,
    'my_open_deal_id', v_open_deal,
    'is_mine', (v_me.id is not null and v_listing.seller_id = v_me.id)
  );
end $$;

-- ============================================================================
-- 11. m_create_listing
-- ============================================================================
create or replace function public.m_create_listing(
  p_token text,
  p_data jsonb
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_title text := btrim(coalesce(p_data->>'title', ''));
  v_desc text := left(btrim(coalesce(p_data->>'description', '')), 500);
  v_cat text := lower(btrim(coalesce(p_data->>'category', 'other')));
  v_cond text := lower(btrim(coalesce(p_data->>'condition', 'good')));
  v_kind text := lower(btrim(coalesce(p_data->>'kind', 'sell')));
  v_price bigint := coalesce((p_data->>'price_minor')::bigint, 0);
  v_spot text := left(nullif(btrim(coalesce(p_data->>'meetup_spot', '')), ''), 80);
  v_campus text := left(coalesce(nullif(btrim(p_data->>'campus'), ''), v_me.campus), 60);
  v_photos text[];
  v_listing mudra.listings;
  v_prev_count int := 0;
  v_bot mudra.profiles;
  v_offer_amt bigint;
  v_short text;
  v_deal mudra.deals;
begin
  v_me := mudra.auth(p_token);
  v_campus := left(coalesce(nullif(btrim(p_data->>'campus'), ''), v_me.campus), 60);

  if char_length(v_title) < 3 or char_length(v_title) > 60 then
    raise exception 'MUDRA:VALIDATION:title must be between 3 and 60 characters';
  end if;
  if v_cat not in ('books','electronics','phones','home','rides','fashion','sports','hobbies','tickets','other') then
    raise exception 'MUDRA:VALIDATION:invalid category';
  end if;
  if v_cond not in ('new','like_new','good','fair') then
    raise exception 'MUDRA:VALIDATION:invalid condition';
  end if;
  if v_kind not in ('sell','swap','free') then
    raise exception 'MUDRA:VALIDATION:invalid listing kind';
  end if;
  if v_kind <> 'sell' then
    v_price := 0;
  elsif v_price <= 0 then
    raise exception 'MUDRA:VALIDATION:price must be greater than 0 for sell listings';
  end if;

  select coalesce(array_agg(x), '{}'::text[])
    into v_photos
    from jsonb_array_elements_text(coalesce(p_data->'photos', '[]'::jsonb)) x
   where btrim(x) <> '';

  if array_length(v_photos, 1) is null or array_length(v_photos, 1) < 1 or array_length(v_photos, 1) > 6 then
    raise exception 'MUDRA:VALIDATION:provide between 1 and 6 photos';
  end if;

  select count(*) into v_prev_count
    from mudra.listings
   where seller_id = v_me.id;

  insert into mudra.listings(
    seller_id, title, description, category, condition, kind,
    price_minor, currency, photos, meetup_spot, campus, status
  ) values (
    v_me.id, v_title, v_desc, v_cat, v_cond, v_kind,
    v_price, v_me.currency, v_photos, v_spot, v_campus, 'active'
  ) returning * into v_listing;

  -- §8.6 Auto-offer on the seller's very first listing if they have never received an offer
  if v_prev_count = 0 and not exists (select 1 from mudra.deals where seller_id = v_me.id) then
    select * into v_bot
      from mudra.profiles
     where is_demo_bot = true
       and id <> v_me.id
     order by random()
     limit 1;

    if v_bot.id is not null then
      v_offer_amt := case
        when v_kind = 'sell' then greatest(100, round((v_price * 85.0) / 100.0)::bigint)
        else 0
      end;
      v_short := 'MD-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('mudra.deal_seq')::text, 4, '0');

      insert into mudra.deals(
        short_code, listing_id, buyer_id, seller_id, kind, amount_minor, currency,
        swap_offer, state, version, offer_by, seller_unread
      ) values (
        v_short,
        v_listing.id,
        v_bot.id,
        v_me.id,
        v_kind,
        v_offer_amt,
        v_listing.currency,
        case when v_kind = 'swap' then 'ipad pencil / bluetooth speaker' else null end,
        'OFFERED',
        1,
        v_bot.id,
        2
      ) returning * into v_deal;

      perform mudra.voucher(v_deal.id, 'DEAL_STARTED', jsonb_build_object('buyer_id', v_bot.id, 'seller_id', v_me.id, 'amount_minor', v_offer_amt));

      insert into mudra.messages(deal_id, sender_id, kind, body, quick_key, lang)
      values (v_deal.id, v_bot.id, 'quick', 'hi! is this still available?', 'still_available', v_bot.locale);

      insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
      values (
        v_deal.id,
        v_bot.id,
        'offer',
        case when v_kind = 'sell' then 'made an offer' when v_kind = 'swap' then 'offered a swap' else 'requested this item' end,
        jsonb_build_object('amount_minor', v_offer_amt, 'currency', v_listing.currency, 'kind', v_kind),
        v_bot.locale
      );

      perform mudra.emit(v_me.id, v_deal.id, 'deal_offered');
    end if;
  end if;

  return mudra.listing_card_json(v_listing);
end $$;

-- ============================================================================
-- 12. m_update_listing
-- ============================================================================
create or replace function public.m_update_listing(
  p_token text,
  p_listing_id uuid,
  p_patch jsonb
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_listing mudra.listings;
  v_title text;
  v_desc text;
  v_cat text;
  v_cond text;
  v_kind text;
  v_price bigint;
  v_spot text;
  v_campus text;
  v_photos text[];
begin
  v_me := mudra.auth(p_token);
  select * into v_listing from mudra.listings where id = p_listing_id for update;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:listing not found';
  end if;
  if v_listing.seller_id <> v_me.id then
    raise exception 'MUDRA:FORBIDDEN:not your listing';
  end if;
  if v_listing.status in ('reserved','sold') then
    raise exception 'MUDRA:BAD_STATE:cannot edit reserved or sold listing';
  end if;

  v_title := coalesce(nullif(btrim(p_patch->>'title'), ''), v_listing.title);
  v_desc := case when p_patch ? 'description' then left(btrim(coalesce(p_patch->>'description','')), 500) else v_listing.description end;
  v_cat := lower(coalesce(nullif(btrim(p_patch->>'category'), ''), v_listing.category));
  v_cond := lower(coalesce(nullif(btrim(p_patch->>'condition'), ''), v_listing.condition));
  v_kind := lower(coalesce(nullif(btrim(p_patch->>'kind'), ''), v_listing.kind));
  v_price := case when p_patch ? 'price_minor' then (p_patch->>'price_minor')::bigint else v_listing.price_minor end;
  if v_kind <> 'sell' then v_price := 0; end if;
  v_spot := case when p_patch ? 'meetup_spot' then left(nullif(btrim(p_patch->>'meetup_spot'), ''), 80) else v_listing.meetup_spot end;
  v_campus := case when p_patch ? 'campus' then left(nullif(btrim(p_patch->>'campus'), ''), 60) else v_listing.campus end;

  if p_patch ? 'photos' then
    select coalesce(array_agg(x), '{}'::text[])
      into v_photos
      from jsonb_array_elements_text(p_patch->'photos') x
     where btrim(x) <> '';
  else
    v_photos := v_listing.photos;
  end if;

  update mudra.listings
     set title = v_title,
         description = v_desc,
         category = v_cat,
         condition = v_cond,
         kind = v_kind,
         price_minor = v_price,
         photos = v_photos,
         meetup_spot = v_spot,
         campus = v_campus,
         updated_at = now()
   where id = v_listing.id
   returning * into v_listing;

  return mudra.listing_card_json(v_listing);
end $$;

-- ============================================================================
-- 13. m_set_listing_status
-- ============================================================================
create or replace function public.m_set_listing_status(
  p_token text,
  p_listing_id uuid,
  p_status text
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_listing mudra.listings;
  v_st text := lower(btrim(coalesce(p_status, '')));
begin
  v_me := mudra.auth(p_token);
  if v_st not in ('active','removed','sold') then
    raise exception 'MUDRA:VALIDATION:invalid listing status';
  end if;

  select * into v_listing from mudra.listings where id = p_listing_id for update;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:listing not found';
  end if;
  if v_listing.seller_id <> v_me.id then
    raise exception 'MUDRA:FORBIDDEN:not your listing';
  end if;

  update mudra.listings
     set status = v_st, updated_at = now()
   where id = v_listing.id
   returning * into v_listing;

  return mudra.listing_card_json(v_listing);
end $$;

-- ============================================================================
-- 14. m_my_listings
-- ============================================================================
create or replace function public.m_my_listings(p_token text) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_res jsonb;
begin
  v_me := mudra.auth(p_token);

  select coalesce(jsonb_agg(
    mudra.listing_card_json(l) || jsonb_build_object(
      'offer_count', (
        select count(*) from mudra.deals d
         where d.listing_id = l.id
           and d.state not in ('DECLINED','CANCELLED')
      )
    )
    order by l.created_at desc
  ), '[]'::jsonb)
    into v_res
    from mudra.listings l
   where l.seller_id = v_me.id
     and l.status <> 'removed';

  return v_res;
end $$;

-- ============================================================================
-- 15. m_toggle_save & 16. m_saved
-- ============================================================================
create or replace function public.m_toggle_save(p_token text, p_listing_id uuid) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
begin
  v_me := mudra.auth(p_token);
  if exists (select 1 from mudra.saves where profile_id = v_me.id and listing_id = p_listing_id) then
    delete from mudra.saves where profile_id = v_me.id and listing_id = p_listing_id;
    return jsonb_build_object('saved', false);
  else
    insert into mudra.saves(profile_id, listing_id) values (v_me.id, p_listing_id)
    on conflict do nothing;
    return jsonb_build_object('saved', true);
  end if;
end $$;

create or replace function public.m_saved(p_token text) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_res jsonb;
begin
  v_me := mudra.auth(p_token);
  select coalesce(jsonb_agg(mudra.listing_card_json(l) order by s.created_at desc), '[]'::jsonb)
    into v_res
    from mudra.saves s
    join mudra.listings l on l.id = s.listing_id
   where s.profile_id = v_me.id
     and l.status <> 'removed';
  return v_res;
end $$;

-- ============================================================================
-- 17. m_seller_profile
-- ============================================================================
create or replace function public.m_seller_profile(
  p_token text default null,
  p_profile_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_prof mudra.profiles;
  v_rating numeric := null;
  v_listings jsonb;
  v_reviews jsonb;
begin
  select * into v_prof
    from mudra.profiles
   where id = p_profile_id and deleted_at is null;

  if not found then
    raise exception 'MUDRA:NOT_FOUND:seller not found';
  end if;

  if v_prof.rating_count > 0 then
    v_rating := round(v_prof.rating_sum::numeric / v_prof.rating_count::numeric, 1);
  end if;

  select coalesce(jsonb_agg(mudra.listing_card_json(l) order by l.created_at desc), '[]'::jsonb)
    into v_listings
    from mudra.listings l
   where l.seller_id = v_prof.id and l.status = 'active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'stars', r.stars,
    'body', r.body,
    'tags', to_jsonb(r.tags),
    'created_at', r.created_at,
    'author', jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'avatar_hue', a.avatar_hue
    )
  )), '[]'::jsonb)
    into v_reviews
    from (
      select * from mudra.reviews
       where subject_id = v_prof.id
       order by created_at desc
       limit 5
    ) r
    join mudra.profiles a on a.id = r.author_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_prof.id,
      'name', v_prof.name,
      'avatar_hue', v_prof.avatar_hue,
      'campus', v_prof.campus,
      'bio', v_prof.bio,
      'rating', v_rating,
      'rating_count', v_prof.rating_count,
      'deals_done', v_prof.deals_done,
      'created_at', v_prof.created_at
    ),
    'listings', v_listings,
    'reviews', v_reviews
  );
end $$;

-- ============================================================================
-- 18. m_start_deal
-- ============================================================================
create or replace function public.m_start_deal(
  p_token text,
  p_listing_id uuid,
  p_amount_minor bigint default null,
  p_swap_offer text default null,
  p_note text default null,
  p_idem text default null
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_listing mudra.listings;
  v_existing mudra.deals;
  v_deal mudra.deals;
  v_amt bigint;
  v_state text;
  v_short text;
  v_res jsonb;
begin
  v_me := mudra.auth(p_token);

  if p_idem is not null and btrim(p_idem) <> '' then
    select response into v_res
      from mudra.idempotency
     where key = p_idem and profile_id = v_me.id;
    if found then
      return v_res;
    end if;
  end if;

  select * into v_listing from mudra.listings where id = p_listing_id for update;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:listing not found';
  end if;
  if v_listing.seller_id = v_me.id then
    raise exception 'MUDRA:OWN_LISTING:cannot start a deal on your own listing';
  end if;

  select * into v_existing
    from mudra.deals
   where listing_id = v_listing.id
     and buyer_id = v_me.id
     and state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')
   limit 1;

  if found then
    return mudra.deal_json(v_existing, v_me.id);
  end if;

  if v_listing.status <> 'active' then
    raise exception 'MUDRA:LISTING_UNAVAILABLE:listing is not available';
  end if;

  if v_listing.kind = 'sell' then
    v_amt := coalesce(p_amount_minor, v_listing.price_minor);
    if v_amt <= 0 then
      raise exception 'MUDRA:VALIDATION:offer amount must be positive';
    end if;
    if v_amt >= v_listing.price_minor then
      v_amt := v_listing.price_minor;
      v_state := 'CREATED';
    else
      v_state := 'OFFERED';
    end if;
  else
    v_amt := 0;
    v_state := 'OFFERED';
  end if;

  v_short := 'MD-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('mudra.deal_seq')::text, 4, '0');

  insert into mudra.deals(
    short_code, listing_id, buyer_id, seller_id, kind, amount_minor, currency,
    swap_offer, state, version, offer_by, seller_unread
  ) values (
    v_short,
    v_listing.id,
    v_me.id,
    v_listing.seller_id,
    v_listing.kind,
    v_amt,
    v_listing.currency,
    nullif(btrim(coalesce(p_swap_offer, '')), ''),
    v_state,
    1,
    v_me.id,
    1
  ) returning * into v_deal;

  perform mudra.voucher(
    v_deal.id,
    'DEAL_STARTED',
    jsonb_build_object('buyer_id', v_me.id, 'seller_id', v_listing.seller_id, 'amount_minor', v_amt, 'state', v_state)
  );

  if v_state = 'CREATED' then
    perform mudra.sys_msg(v_deal.id, 'system', 'deal created at listing price — ready to lock escrow', jsonb_build_object('amount_minor', v_amt));
    if p_note is not null and btrim(p_note) <> '' then
      insert into mudra.messages(deal_id, sender_id, kind, body, lang)
      values (v_deal.id, v_me.id, 'text', mudra.scrub_pii(left(btrim(p_note), 500)), v_me.locale);
    end if;
  else
    insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
    values (
      v_deal.id,
      v_me.id,
      'offer',
      coalesce(nullif(mudra.scrub_pii(left(btrim(coalesce(p_note, '')), 500)), ''), case
        when v_listing.kind = 'swap' then coalesce(p_swap_offer, 'swap offer')
        when v_listing.kind = 'free' then 'requested free item'
        else 'made an offer'
      end),
      jsonb_build_object('amount_minor', v_amt, 'currency', v_listing.currency, 'swap_offer', p_swap_offer, 'kind', v_listing.kind),
      v_me.locale
    );
  end if;

  perform mudra.emit(v_listing.seller_id, v_deal.id, 'deal_started');

  v_res := mudra.deal_json(v_deal, v_me.id);
  if p_idem is not null and btrim(p_idem) <> '' then
    insert into mudra.idempotency(key, profile_id, response)
    values (p_idem, v_me.id, v_res)
    on conflict (key) do nothing;
  end if;

  return v_res;
end $$;

-- ============================================================================
-- 19. m_deal_action (§8.3)
-- ============================================================================
create or replace function public.m_deal_action(
  p_token text,
  p_deal_id uuid,
  p_action text,
  p_expected_version int,
  p_payload jsonb default '{}'::jsonb,
  p_idem text default null
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_deal mudra.deals;
  v_listing mudra.listings;
  v_allowed text[];
  v_act text := upper(btrim(coalesce(p_action, '')));
  v_pay jsonb := coalesce(p_payload, '{}'::jsonb);
  v_amt bigint;
  v_swap text;
  v_idx int;
  v_photo text;
  v_chk jsonb;
  v_stars int;
  v_body text;
  v_tags text[];
  v_subject uuid;
  v_vhash text;
  v_other_deal mudra.deals;
  v_res jsonb;
begin
  v_me := mudra.auth(p_token);

  if p_idem is not null and btrim(p_idem) <> '' then
    select response into v_res
      from mudra.idempotency
     where key = p_idem and profile_id = v_me.id;
    if found then
      return v_res;
    end if;
  end if;

  select * into v_deal from mudra.deals where id = p_deal_id for update;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:deal not found';
  end if;

  if v_me.id <> v_deal.buyer_id and v_me.id <> v_deal.seller_id then
    raise exception 'MUDRA:FORBIDDEN:not a participant in this deal';
  end if;

  if v_deal.version <> p_expected_version then
    raise exception 'MUDRA:VERSION_CONFLICT:expected % got %', p_expected_version, v_deal.version;
  end if;

  v_allowed := mudra.allowed_actions(v_deal, v_me.id);
  if not (v_act = any(v_allowed)) then
    raise exception 'MUDRA:BAD_STATE:%', v_deal.state;
  end if;

  select * into v_listing from mudra.listings where id = v_deal.listing_id for update;

  case v_act
    when 'ACCEPT' then
      if v_deal.amount_minor > 0 then
        v_deal.state := 'CREATED';
      else
        v_deal.state := 'FUNDED';
        update mudra.listings set status = 'reserved', updated_at = now() where id = v_deal.listing_id;
      end if;
      perform mudra.voucher(v_deal.id, 'OFFER_ACCEPTED', jsonb_build_object('by', v_me.id, 'amount_minor', v_deal.amount_minor, 'state', v_deal.state));
      perform mudra.sys_msg(v_deal.id, 'system', 'offer accepted', jsonb_build_object('amount_minor', v_deal.amount_minor));

    when 'COUNTER' then
      v_amt := coalesce((v_pay->>'amount_minor')::bigint, v_deal.amount_minor);
      v_swap := coalesce(v_pay->>'swap_offer', v_deal.swap_offer);
      if v_deal.kind = 'sell' and v_amt <= 0 then
        raise exception 'MUDRA:VALIDATION:counter amount must be positive';
      end if;
      v_deal.amount_minor := v_amt;
      v_deal.swap_offer := v_swap;
      v_deal.offer_by := v_me.id;
      if v_me.id = v_deal.buyer_id then
        v_deal.seller_unread := v_deal.seller_unread + 1;
      else
        v_deal.buyer_unread := v_deal.buyer_unread + 1;
      end if;
      insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
      values (
        v_deal.id,
        v_me.id,
        'offer',
        coalesce(nullif(btrim(v_pay->>'note'), ''), 'counter offer'),
        jsonb_build_object('amount_minor', v_amt, 'currency', v_deal.currency, 'swap_offer', v_swap, 'counter', true, 'kind', v_deal.kind),
        v_me.locale
      );
      perform mudra.voucher(v_deal.id, 'OFFER_COUNTERED', jsonb_build_object('by', v_me.id, 'amount_minor', v_amt));

    when 'DECLINE' then
      v_deal.state := 'DECLINED';
      perform mudra.voucher(v_deal.id, 'OFFER_DECLINED', jsonb_build_object('by', v_me.id));
      perform mudra.sys_msg(v_deal.id, 'system', 'offer declined');

    when 'CANCEL' then
      if v_deal.state = 'FUNDED' then
        if v_deal.escrow_locked_minor > 0 then
          perform mudra.wallet_move(
            v_deal.buyer_id,
            v_deal.currency,
            v_deal.escrow_locked_minor,
            'refund',
            v_deal.id,
            'refund from ' || v_deal.short_code
          );
        end if;
        update mudra.listings set status = 'active', updated_at = now() where id = v_deal.listing_id;
        v_deal.state := 'REFUNDED';
        perform mudra.voucher(v_deal.id, 'REFUNDED', jsonb_build_object('by', v_me.id, 'amount_minor', v_deal.escrow_locked_minor));
        perform mudra.sys_msg(v_deal.id, 'system', 'seller cancelled — full refund issued');
      else
        v_deal.state := 'CANCELLED';
        perform mudra.voucher(v_deal.id, 'CANCELLED', jsonb_build_object('by', v_me.id));
        perform mudra.sys_msg(v_deal.id, 'system', 'deal cancelled');
      end if;

    when 'LOCK_ESCROW' then
      if v_listing.status not in ('active','reserved') then
        raise exception 'MUDRA:LISTING_UNAVAILABLE:listing is no longer available';
      end if;
      if v_deal.amount_minor > 0 then
        perform mudra.wallet_move(
          v_deal.buyer_id,
          v_deal.currency,
          -v_deal.amount_minor,
          'escrow_lock',
          v_deal.id,
          'locked for ' || v_deal.short_code
        );
      end if;
      update mudra.listings set status = 'reserved', updated_at = now() where id = v_deal.listing_id;
      v_deal.escrow_locked_minor := v_deal.amount_minor;
      v_deal.state := 'FUNDED';
      v_vhash := mudra.voucher(
        v_deal.id,
        'ESCROW_LOCKED',
        jsonb_build_object(
          'buyer_id', v_deal.buyer_id,
          'amount_minor', v_deal.amount_minor,
          'currency', v_deal.currency,
          'method', case when nullif(current_setting('mudra.upi_utr', true), '') is null then 'wallet' else 'upi' end,
          'utr', nullif(current_setting('mudra.upi_utr', true), '')
        )
      );
      perform mudra.sys_msg(
        v_deal.id,
        'escrow',
        'money locked in escrow',
        jsonb_build_object(
          'amount_minor', v_deal.amount_minor,
          'currency', v_deal.currency,
          'voucher_hash', v_vhash,
          'method', case when nullif(current_setting('mudra.upi_utr', true), '') is null then 'wallet' else 'upi' end,
          'utr', nullif(current_setting('mudra.upi_utr', true), '')
        )
      );

    when 'START_ASSAY' then
      v_deal.inspection_mode := 'live';
      v_deal.checklist := mudra.checklist_for(v_listing.category);
      v_deal.state := 'INSPECTION_LIVE';
      perform mudra.voucher(v_deal.id, 'ASSAY_STARTED', jsonb_build_object('seller_id', v_deal.seller_id, 'category', v_listing.category));
      perform mudra.sys_msg(v_deal.id, 'system', 'live check started');

    when 'CHOOSE_IN_PERSON' then
      v_deal.inspection_mode := 'in_person';
      perform mudra.voucher(v_deal.id, 'IN_PERSON_CHOSEN', jsonb_build_object('buyer_id', v_deal.buyer_id));
      perform mudra.sys_msg(v_deal.id, 'system', 'buyer chose in-person check');

    when 'CONFIRM_IN_PERSON' then
      v_deal.inspection_mode := 'in_person';
      v_deal.state := 'ASSAY_VERIFIED';
      perform mudra.voucher(v_deal.id, 'ASSAY_VERIFIED', jsonb_build_object('buyer_id', v_deal.buyer_id, 'mode', 'in_person'));
      perform mudra.sys_msg(v_deal.id, 'system', 'item verified in person');

    when 'CHECK_ITEM' then
      v_idx := coalesce((v_pay->>'index')::int, 0);
      v_photo := btrim(coalesce(v_pay->>'photo_url', ''));
      if v_photo = '' then
        raise exception 'MUDRA:VALIDATION:photo_url is required';
      end if;
      if v_idx < 0 or v_idx >= jsonb_array_length(v_deal.checklist) then
        raise exception 'MUDRA:VALIDATION:invalid checklist index';
      end if;
      v_chk := jsonb_set(
        v_deal.checklist,
        array[v_idx::text],
        (v_deal.checklist->v_idx) || jsonb_build_object('photo_url', v_photo, 'at', now())
      );
      v_deal.checklist := v_chk;
      v_deal.buyer_unread := v_deal.buyer_unread + 1;
      insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
      values (
        v_deal.id,
        v_me.id,
        'evidence',
        coalesce(v_chk->v_idx->>'label', 'live check photo'),
        jsonb_build_object('index', v_idx, 'photo_url', v_photo, 'label', v_chk->v_idx->>'label'),
        v_me.locale
      );
      perform mudra.voucher(v_deal.id, 'CHECK_ITEM', jsonb_build_object('index', v_idx, 'photo_url', v_photo));

    when 'MARK_ASSAY_VERIFIED' then
      v_deal.state := 'ASSAY_VERIFIED';
      v_vhash := mudra.voucher(v_deal.id, 'ASSAY_VERIFIED', jsonb_build_object('buyer_id', v_deal.buyer_id, 'mode', 'live'));
      perform mudra.sys_msg(v_deal.id, 'system', 'live check verified by buyer', jsonb_build_object('voucher_hash', v_vhash));

    when 'RELEASE_FUNDS' then
      if v_deal.escrow_locked_minor > 0 then
        perform mudra.wallet_move(
          v_deal.seller_id,
          v_deal.currency,
          v_deal.escrow_locked_minor,
          'escrow_release',
          v_deal.id,
          'released from ' || v_deal.short_code
        );
      end if;
      update mudra.listings set status = 'sold', updated_at = now() where id = v_deal.listing_id;

      -- Decline any other open deals on this listing (+ refund if funded)
      for v_other_deal in
        select * from mudra.deals
         where listing_id = v_deal.listing_id
           and id <> v_deal.id
           and state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')
         for update
      loop
        if v_other_deal.escrow_locked_minor > 0 and v_other_deal.state in ('FUNDED','INSPECTION_LIVE','ASSAY_VERIFIED','DISPUTED_FROZEN') then
          perform mudra.wallet_move(
            v_other_deal.buyer_id,
            v_other_deal.currency,
            v_other_deal.escrow_locked_minor,
            'refund',
            v_other_deal.id,
            'refund from ' || v_other_deal.short_code
          );
        end if;
        update mudra.deals
           set state = 'DECLINED', version = version + 1, updated_at = now()
         where id = v_other_deal.id;
      end loop;

      update mudra.profiles
         set deals_done = deals_done + 1
       where id in (v_deal.buyer_id, v_deal.seller_id);

      v_deal.state := 'RELEASED';
      v_vhash := mudra.voucher(
        v_deal.id,
        'RELEASED',
        jsonb_build_object('buyer_id', v_deal.buyer_id, 'seller_id', v_deal.seller_id, 'amount_minor', v_deal.escrow_locked_minor)
      );
      perform mudra.sys_msg(
        v_deal.id,
        'receipt',
        'money released to seller',
        jsonb_build_object('amount_minor', v_deal.escrow_locked_minor, 'currency', v_deal.currency, 'voucher_hash', v_vhash)
      );

    when 'RAISE_DISPUTE' then
      if v_deal.amount_minor = 0 and v_deal.escrow_locked_minor = 0 then
        -- Swap / free deal freeze -> cancelled with no money involved
        update mudra.listings set status = 'active', updated_at = now() where id = v_deal.listing_id;
        v_deal.verdict := jsonb_build_object(
          'seller_pct', 0,
          'buyer_pct', 0,
          'seller_minor', 0,
          'buyer_minor', 0,
          'reason', 'deal cancelled, no money involved'
        );
        v_deal.state := 'CANCELLED';
        perform mudra.voucher(v_deal.id, 'FROZEN_CANCELLED', v_deal.verdict);
        perform mudra.sys_msg(v_deal.id, 'verdict', 'deal cancelled, no money involved', v_deal.verdict);
      else
        if v_deal.state = 'ASSAY_VERIFIED' then
          v_deal.verified_before_freeze := true;
        end if;
        v_deal.frozen_from_state := v_deal.state;
        v_deal.frozen_at := now();
        v_deal.freeze_ends_at := now() + interval '90 seconds';
        v_deal.frozen_by := v_me.id;
        v_deal.state := 'DISPUTED_FROZEN';
        v_vhash := mudra.voucher(
          v_deal.id,
          'FROZEN',
          jsonb_build_object('by', v_me.id, 'from_state', v_deal.frozen_from_state, 'reason', v_pay->>'reason')
        );
        perform mudra.sys_msg(
          v_deal.id,
          'system',
          'deal frozen — 90s resolution desk started',
          jsonb_build_object('reason', v_pay->>'reason', 'freeze_ends_at', v_deal.freeze_ends_at, 'voucher_hash', v_vhash)
        );
      end if;

    when 'ADD_STATEMENT' then
      v_body := left(btrim(coalesce(v_pay->>'text', v_pay->>'statement', '')), 280);
      if v_body = '' then
        raise exception 'MUDRA:VALIDATION:statement cannot be empty';
      end if;
      if v_me.id = v_deal.buyer_id then
        v_deal.buyer_statement := v_body;
      else
        v_deal.seller_statement := v_body;
      end if;
      perform mudra.voucher(v_deal.id, 'STATEMENT_ADDED', jsonb_build_object('by', v_me.id, 'text', v_body));
      perform mudra.sys_msg(v_deal.id, 'system', 'statement added to resolution desk', jsonb_build_object('by', v_me.id, 'text', v_body));

    when 'LEAVE_REVIEW' then
      v_stars := (v_pay->>'stars')::int;
      if v_stars is null or v_stars < 1 or v_stars > 5 then
        raise exception 'MUDRA:VALIDATION:stars must be between 1 and 5';
      end if;
      v_body := left(btrim(coalesce(v_pay->>'body', '')), 200);
      select coalesce(array_agg(x), '{}'::text[])
        into v_tags
        from jsonb_array_elements_text(coalesce(v_pay->'tags', '[]'::jsonb)) x;
      v_subject := case when v_me.id = v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end;

      insert into mudra.reviews(deal_id, author_id, subject_id, stars, body, tags)
      values (v_deal.id, v_me.id, v_subject, v_stars, v_body, v_tags)
      on conflict (deal_id, author_id) do nothing;

      update mudra.profiles
         set rating_sum = rating_sum + v_stars,
             rating_count = rating_count + 1
       where id = v_subject;

      if v_me.id = v_deal.buyer_id then
        v_deal.buyer_reviewed := true;
      else
        v_deal.seller_reviewed := true;
      end if;
      perform mudra.sys_msg(v_deal.id, 'system', 'left a ' || v_stars || '-star review');
  end case;

  update mudra.deals
     set amount_minor = v_deal.amount_minor,
         swap_offer = v_deal.swap_offer,
         state = v_deal.state,
         version = v_deal.version + 1,
         offer_by = v_deal.offer_by,
         inspection_mode = v_deal.inspection_mode,
         checklist = v_deal.checklist,
         escrow_locked_minor = v_deal.escrow_locked_minor,
         verified_before_freeze = v_deal.verified_before_freeze,
         frozen_from_state = v_deal.frozen_from_state,
         frozen_at = v_deal.frozen_at,
         freeze_ends_at = v_deal.freeze_ends_at,
         frozen_by = v_deal.frozen_by,
         buyer_statement = v_deal.buyer_statement,
         seller_statement = v_deal.seller_statement,
         verdict = v_deal.verdict,
         buyer_unread = v_deal.buyer_unread,
         seller_unread = v_deal.seller_unread,
         buyer_reviewed = v_deal.buyer_reviewed,
         seller_reviewed = v_deal.seller_reviewed,
         updated_at = now()
   where id = v_deal.id
   returning * into v_deal;

  perform mudra.emit(v_deal.buyer_id, v_deal.id, 'deal_' || lower(v_act));
  perform mudra.emit(v_deal.seller_id, v_deal.id, 'deal_' || lower(v_act));

  v_res := mudra.deal_json(v_deal, v_me.id);
  if p_idem is not null and btrim(p_idem) <> '' then
    insert into mudra.idempotency(key, profile_id, response)
    values (p_idem, v_me.id, v_res)
    on conflict (key) do nothing;
  end if;

  return v_res;
end $$;

-- ============================================================================
-- 20. m_deals & 21. m_deal
-- ============================================================================
create or replace function public.m_deals(
  p_token text,
  p_role text default 'all'
) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_role text := lower(coalesce(p_role, 'all'));
  v_res jsonb;
begin
  v_me := mudra.auth(p_token);

  select coalesce(jsonb_agg(
    mudra.deal_json(d, v_me.id)
    order by
      case
        when d.state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')
             and cardinality(mudra.allowed_actions(d, v_me.id)) > 0
             and (
               (d.state = 'OFFERED' and d.offer_by <> v_me.id) or
               (d.state = 'CREATED' and d.buyer_id = v_me.id) or
               (d.state = 'FUNDED' and (d.seller_id = v_me.id or (d.buyer_id = v_me.id and d.inspection_mode = 'in_person'))) or
               (d.state = 'INSPECTION_LIVE') or
               (d.state = 'ASSAY_VERIFIED' and d.buyer_id = v_me.id) or
               (d.state = 'DISPUTED_FROZEN')
             )
        then 0
        when d.state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')
        then 1
        else 2
      end asc,
      d.updated_at desc
  ), '[]'::jsonb)
    into v_res
    from mudra.deals d
   where (v_role = 'buyer' and d.buyer_id = v_me.id)
      or (v_role = 'seller' and d.seller_id = v_me.id)
      or (v_role not in ('buyer','seller') and (d.buyer_id = v_me.id or d.seller_id = v_me.id));

  return v_res;
end $$;

create or replace function public.m_deal(
  p_token text,
  p_deal_id uuid
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_deal mudra.deals;
begin
  v_me := mudra.auth(p_token);

  select * into v_deal from mudra.deals where id = p_deal_id;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:deal not found';
  end if;
  if v_me.id <> v_deal.buyer_id and v_me.id <> v_deal.seller_id then
    raise exception 'MUDRA:FORBIDDEN:not a participant in this deal';
  end if;

  if v_me.id = v_deal.buyer_id and v_deal.buyer_unread > 0 then
    update mudra.deals set buyer_unread = 0 where id = v_deal.id returning * into v_deal;
  elsif v_me.id = v_deal.seller_id and v_deal.seller_unread > 0 then
    update mudra.deals set seller_unread = 0 where id = v_deal.id returning * into v_deal;
  end if;

  return mudra.deal_json(v_deal, v_me.id);
end $$;

-- ============================================================================
-- 22. m_messages & 23. m_send_message
-- ============================================================================
create or replace function public.m_messages(
  p_token text,
  p_deal_id uuid,
  p_after_id bigint default 0
) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_deal mudra.deals;
  v_res jsonb;
begin
  v_me := mudra.auth(p_token);
  select * into v_deal from mudra.deals where id = p_deal_id;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:deal not found';
  end if;
  if v_me.id <> v_deal.buyer_id and v_me.id <> v_deal.seller_id then
    raise exception 'MUDRA:FORBIDDEN:not a participant in this deal';
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.id asc), '[]'::jsonb)
    into v_res
    from (
      select *
        from mudra.messages
       where deal_id = p_deal_id
         and id > coalesce(p_after_id, 0)
       order by id asc
       limit 200
    ) m;

  return v_res;
end $$;

create or replace function public.m_send_message(
  p_token text,
  p_deal_id uuid,
  p_body text,
  p_quick_key text default null,
  p_client_id text default null
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_deal mudra.deals;
  v_body text := btrim(coalesce(p_body, ''));
  v_scrubbed text;
  v_masked boolean := false;
  v_msg mudra.messages;
  v_other uuid;
begin
  v_me := mudra.auth(p_token);
  select * into v_deal from mudra.deals where id = p_deal_id for update;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:deal not found';
  end if;
  if v_me.id <> v_deal.buyer_id and v_me.id <> v_deal.seller_id then
    raise exception 'MUDRA:FORBIDDEN:not a participant in this deal';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then
    raise exception 'MUDRA:VALIDATION:message must be 1 to 500 characters';
  end if;

  if v_deal.state in ('OFFERED','CREATED') then
    v_scrubbed := mudra.scrub_pii(v_body);
    v_scrubbed := regexp_replace(v_scrubbed, '\+?\d[\d\s\-]{6,}\d', '•••', 'g');
    if v_scrubbed <> v_body then
      v_body := v_scrubbed;
      v_masked := true;
    end if;
  end if;

  insert into mudra.messages(
    deal_id, sender_id, kind, body, quick_key, payload, lang
  ) values (
    v_deal.id,
    v_me.id,
    case when p_quick_key is not null and btrim(p_quick_key) <> '' then 'quick' else 'text' end,
    v_body,
    nullif(btrim(coalesce(p_quick_key, '')), ''),
    case when p_client_id is not null then jsonb_build_object('client_id', p_client_id) else '{}'::jsonb end,
    v_me.locale
  ) returning * into v_msg;

  if v_me.id = v_deal.buyer_id then
    v_other := v_deal.seller_id;
    update mudra.deals set seller_unread = seller_unread + 1, updated_at = now() where id = v_deal.id;
  else
    v_other := v_deal.buyer_id;
    update mudra.deals set buyer_unread = buyer_unread + 1, updated_at = now() where id = v_deal.id;
  end if;

  if v_masked then
    perform mudra.sys_msg(v_deal.id, 'system', 'share numbers after money is locked — it keeps you safe.');
  end if;

  perform mudra.emit(v_other, v_deal.id, 'message_new');

  return to_jsonb(v_msg);
end $$;

-- ============================================================================
-- 24. m_translate_message (ADR-M8)
-- ============================================================================
create or replace function public.m_translate_message(
  p_token text,
  p_message_id bigint,
  p_target text
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_msg mudra.messages;
  v_deal mudra.deals;
  v_target text := lower(btrim(coalesce(p_target, 'en')));
  v_lang_name text;
  v_clean text;
  v_key text;
  v_model text;
  v_url text;
  v_req jsonb;
  v_resp record;
  v_trans text;
begin
  v_me := mudra.auth(p_token);

  select * into v_msg from mudra.messages where id = p_message_id;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:message not found';
  end if;

  select * into v_deal from mudra.deals where id = v_msg.deal_id;
  if v_me.id <> v_deal.buyer_id and v_me.id <> v_deal.seller_id then
    raise exception 'MUDRA:FORBIDDEN:not a participant in this deal';
  end if;

  if v_msg.translations ? v_target and v_msg.translations->>v_target is not null then
    return jsonb_build_object('text', v_msg.translations->>v_target);
  end if;

  v_lang_name := case v_target
    when 'hi' then 'Hindi'
    when 'ta' then 'Tamil'
    when 'mr' then 'Marathi'
    when 'es' then 'Spanish'
    else 'English'
  end;

  v_clean := mudra.scrub_pii(v_msg.body);
  select value into v_key from mudra.secrets where key = 'gemini_api_key';
  select coalesce((select value from mudra.secrets where key = 'gemini_model'), 'gemini-2.5-flash') into v_model;

  if v_key is null or btrim(v_key) = '' then
    return jsonb_build_object('text', null);
  end if;

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '6');
    v_url := 'https://generativelanguage.googleapis.com/v1beta/models/' || v_model || ':generateContent?key=' || v_key;
    v_req := jsonb_build_object(
      'contents', jsonb_build_array(
        jsonb_build_object(
          'parts', jsonb_build_array(
            jsonb_build_object('text', 'Translate to ' || v_lang_name || '. Output only the translation:' || E'\n' || v_clean)
          )
        )
      )
    );
    select * into v_resp from extensions.http_post(v_url, v_req::text, 'application/json');
    if v_resp.status <> 200 and v_model <> 'gemini-2.5-flash' then
      v_url := 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' || v_key;
      select * into v_resp from extensions.http_post(v_url, v_req::text, 'application/json');
    end if;
    if v_resp.status = 200 then
      v_trans := btrim(((v_resp.content::jsonb)->'candidates'->0->'content'->'parts'->0->>'text'));
      if v_trans is not null and v_trans <> '' then
        update mudra.messages
           set translations = translations || jsonb_build_object(v_target, v_trans)
         where id = v_msg.id;
        return jsonb_build_object('text', v_trans);
      end if;
    end if;
  exception when others then
    return jsonb_build_object('text', null);
  end;

  return jsonb_build_object('text', null);
end $$;

-- ============================================================================
-- 25. m_resolve_if_due (§8.5)
-- ============================================================================
create or replace function public.m_resolve_if_due(
  p_token text,
  p_deal_id uuid
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_deal mudra.deals;
  v_total int := 0;
  v_done int := 0;
  v_seller_pct int;
  v_buyer_pct int;
  v_seller_minor bigint;
  v_buyer_minor bigint;
  v_reason text;
  v_new_state text;
  v_verdict jsonb;
  v_vhash text;
begin
  v_me := mudra.auth(p_token);

  delete from public.m_events where created_at < now() - interval '1 day';

  select * into v_deal from mudra.deals where id = p_deal_id for update;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:deal not found';
  end if;
  if v_me.id <> v_deal.buyer_id and v_me.id <> v_deal.seller_id then
    raise exception 'MUDRA:FORBIDDEN:not a participant in this deal';
  end if;

  if v_deal.state = 'DISPUTED_FROZEN' and now() >= v_deal.freeze_ends_at then
    v_total := jsonb_array_length(coalesce(v_deal.checklist, '[]'::jsonb));
    select count(*) into v_done
      from jsonb_array_elements(coalesce(v_deal.checklist, '[]'::jsonb)) el
     where el->>'photo_url' is not null and btrim(el->>'photo_url') <> '';

    if v_deal.verified_before_freeze
       or v_deal.frozen_from_state = 'ASSAY_VERIFIED'
       or (v_total > 0 and v_done = v_total) then
      v_seller_pct := 70;
      v_buyer_pct := 30;
      v_reason := 'the item was verified before the freeze, so most of the money goes to the seller.';
      v_new_state := 'ARBITRATED_SPLIT';
    elsif v_done >= 1 then
      v_seller_pct := 30;
      v_buyer_pct := 70;
      v_reason := 'the live check was only partly done, so most of the money goes back to the buyer.';
      v_new_state := 'ARBITRATED_SPLIT';
    else
      v_seller_pct := 0;
      v_buyer_pct := 100;
      v_reason := 'no proof of the item was shown, so the buyer gets a full refund.';
      v_new_state := 'REFUNDED';
    end if;

    v_seller_minor := floor((v_deal.escrow_locked_minor * v_seller_pct)::numeric / 100.0)::bigint;
    v_buyer_minor := v_deal.escrow_locked_minor - v_seller_minor;

    if v_seller_minor > 0 then
      perform mudra.wallet_move(
        v_deal.seller_id,
        v_deal.currency,
        v_seller_minor,
        'split',
        v_deal.id,
        'split (' || v_seller_pct || '%) from ' || v_deal.short_code
      );
    end if;

    if v_buyer_minor > 0 then
      perform mudra.wallet_move(
        v_deal.buyer_id,
        v_deal.currency,
        v_buyer_minor,
        case when v_new_state = 'REFUNDED' then 'refund' else 'split' end,
        v_deal.id,
        case when v_new_state = 'REFUNDED' then 'refund from ' || v_deal.short_code else 'split (' || v_buyer_pct || '%) from ' || v_deal.short_code end
      );
    end if;

    update mudra.listings
       set status = case when v_new_state = 'REFUNDED' then 'active' else 'sold' end,
           updated_at = now()
     where id = v_deal.listing_id;

    if v_new_state = 'ARBITRATED_SPLIT' then
      update mudra.profiles set deals_done = deals_done + 1 where id in (v_deal.buyer_id, v_deal.seller_id);
    end if;

    v_verdict := jsonb_build_object(
      'seller_pct', v_seller_pct,
      'buyer_pct', v_buyer_pct,
      'seller_minor', v_seller_minor,
      'buyer_minor', v_buyer_minor,
      'reason', v_reason
    );

    update mudra.deals
       set state = v_new_state,
           verdict = v_verdict,
           version = version + 1,
           updated_at = now()
     where id = v_deal.id
     returning * into v_deal;

    v_vhash := mudra.voucher(v_deal.id, 'VERDICT', v_verdict);
    perform mudra.sys_msg(v_deal.id, 'verdict', v_reason, v_verdict || jsonb_build_object('voucher_hash', v_vhash));
    perform mudra.emit(v_deal.buyer_id, v_deal.id, 'deal_verdict');
    perform mudra.emit(v_deal.seller_id, v_deal.id, 'deal_verdict');
  end if;

  return mudra.deal_json(v_deal, v_me.id);
end $$;

-- ============================================================================
-- 26. m_demo_tick (§8.6)
-- ============================================================================
create or replace function public.m_demo_tick(
  p_token text,
  p_deal_id uuid
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_deal mudra.deals;
  v_listing mudra.listings;
  v_bot_id uuid;
  v_bot mudra.profiles;
  v_bot_is_seller boolean;
  v_mid bigint;
  v_chk jsonb;
  v_idx int;
  v_next_idx int := null;
  v_photo text;
  v_vhash text;
  v_changed boolean := false;
  v_last_msg mudra.messages;
  v_canned text[] := array[
    'sounds good, i can meet near the library gate.',
    'it is in great condition, barely used this semester.',
    'works for me! let''s keep everything inside mudra escrow.',
    'sure thing, ready when you are.',
    'perfect, see you soon on campus.'
  ];
  v_reply text;
begin
  v_me := mudra.auth(p_token);

  select * into v_deal from mudra.deals where id = p_deal_id for update;
  if not found then
    raise exception 'MUDRA:NOT_FOUND:deal not found';
  end if;
  if v_me.id <> v_deal.buyer_id and v_me.id <> v_deal.seller_id then
    raise exception 'MUDRA:FORBIDDEN:not a participant in this deal';
  end if;

  v_bot_id := case when v_me.id = v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end;
  select * into v_bot from mudra.profiles where id = v_bot_id;

  if not coalesce(v_bot.is_demo_bot, false) or v_deal.updated_at > now() - interval '2 seconds' then
    return mudra.deal_json(v_deal, v_me.id);
  end if;

  select * into v_listing from mudra.listings where id = v_deal.listing_id for update;
  v_bot_is_seller := (v_bot.id = v_deal.seller_id);

  if v_bot_is_seller then
    if v_deal.state = 'OFFERED' and v_deal.offer_by = v_me.id then
      if v_deal.kind <> 'sell' or v_deal.amount_minor >= round(v_listing.price_minor * 0.85) then
        v_deal.state := case when v_deal.amount_minor > 0 then 'CREATED' else 'FUNDED' end;
        if v_deal.state = 'FUNDED' then
          update mudra.listings set status = 'reserved', updated_at = now() where id = v_deal.listing_id;
        end if;
        perform mudra.voucher(v_deal.id, 'OFFER_ACCEPTED', jsonb_build_object('by', v_bot.id, 'amount_minor', v_deal.amount_minor));
        perform mudra.sys_msg(v_deal.id, 'system', 'offer accepted');
        v_changed := true;
      else
        v_mid := greatest(100, round(((v_deal.amount_minor + v_listing.price_minor) / 2.0) / 100.0)::bigint * 100);
        v_deal.amount_minor := v_mid;
        v_deal.offer_by := v_bot.id;
        v_deal.buyer_unread := v_deal.buyer_unread + 1;
        insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
        values (
          v_deal.id,
          v_bot.id,
          'offer',
          'can do ' || (v_mid / 100)::text || '. it''s in great shape.',
          jsonb_build_object('amount_minor', v_mid, 'currency', v_deal.currency, 'counter', true, 'kind', v_deal.kind),
          v_bot.locale
        );
        perform mudra.voucher(v_deal.id, 'OFFER_COUNTERED', jsonb_build_object('by', v_bot.id, 'amount_minor', v_mid));
        v_changed := true;
      end if;

    elsif v_deal.state = 'FUNDED' then
      insert into mudra.messages(deal_id, sender_id, kind, body, quick_key, lang)
      values (v_deal.id, v_bot.id, 'quick', 'locked, thanks. going live now.', 'going_live', v_bot.locale);
      v_deal.inspection_mode := 'live';
      v_deal.checklist := mudra.checklist_for(v_listing.category);
      v_deal.state := 'INSPECTION_LIVE';
      v_deal.buyer_unread := v_deal.buyer_unread + 1;
      perform mudra.voucher(v_deal.id, 'ASSAY_STARTED', jsonb_build_object('seller_id', v_bot.id));
      perform mudra.sys_msg(v_deal.id, 'system', 'seller started live check');
      v_changed := true;

    elsif v_deal.state = 'INSPECTION_LIVE' then
      for v_idx in 0..(jsonb_array_length(v_deal.checklist) - 1) loop
        if (v_deal.checklist->v_idx->>'photo_url') is null then
          v_next_idx := v_idx;
          exit;
        end if;
      end loop;

      if v_next_idx is not null then
        v_photo := v_listing.photos[(v_next_idx % array_length(v_listing.photos, 1)) + 1];
        v_chk := jsonb_set(
          v_deal.checklist,
          array[v_next_idx::text],
          (v_deal.checklist->v_next_idx) || jsonb_build_object('photo_url', v_photo, 'at', now())
        );
        v_deal.checklist := v_chk;
        v_deal.buyer_unread := v_deal.buyer_unread + 1;
        insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
        values (
          v_deal.id,
          v_bot.id,
          'evidence',
          coalesce(v_chk->v_next_idx->>'label', 'live check photo'),
          jsonb_build_object('index', v_next_idx, 'photo_url', v_photo, 'label', v_chk->v_next_idx->>'label'),
          v_bot.locale
        );
        perform mudra.voucher(v_deal.id, 'CHECK_ITEM', jsonb_build_object('index', v_next_idx, 'photo_url', v_photo));
        v_changed := true;
      end if;

    elsif v_deal.state = 'RELEASED' and not v_deal.seller_reviewed then
      insert into mudra.reviews(deal_id, author_id, subject_id, stars, body, tags)
      values (v_deal.id, v_bot.id, v_me.id, 5, 'smooth deal', array['on time','friendly'])
      on conflict (deal_id, author_id) do nothing;
      update mudra.profiles set rating_sum = rating_sum + 5, rating_count = rating_count + 1 where id = v_me.id;
      v_deal.seller_reviewed := true;
      perform mudra.sys_msg(v_deal.id, 'system', 'left a 5-star review');
      v_changed := true;
    end if;

  else
    -- Bot is buyer
    if v_deal.state = 'OFFERED' and v_deal.offer_by = v_me.id then
      v_deal.state := case when v_deal.amount_minor > 0 then 'CREATED' else 'FUNDED' end;
      if v_deal.state = 'FUNDED' then
        update mudra.listings set status = 'reserved', updated_at = now() where id = v_deal.listing_id;
      end if;
      perform mudra.voucher(v_deal.id, 'OFFER_ACCEPTED', jsonb_build_object('by', v_bot.id, 'amount_minor', v_deal.amount_minor));
      perform mudra.sys_msg(v_deal.id, 'system', 'offer accepted');
      v_changed := true;

    elsif v_deal.state = 'CREATED' then
      -- Ensure bot has enough credits
      perform mudra.wallet_move(v_bot.id, v_deal.currency, greatest(v_deal.amount_minor * 2, 1000000), 'topup', v_deal.id, 'bot auto topup');
      if v_deal.amount_minor > 0 then
        perform mudra.wallet_move(v_bot.id, v_deal.currency, -v_deal.amount_minor, 'escrow_lock', v_deal.id, 'locked for ' || v_deal.short_code);
      end if;
      update mudra.listings set status = 'reserved', updated_at = now() where id = v_deal.listing_id;
      v_deal.escrow_locked_minor := v_deal.amount_minor;
      v_deal.state := 'FUNDED';
      v_vhash := mudra.voucher(v_deal.id, 'ESCROW_LOCKED', jsonb_build_object('buyer_id', v_bot.id, 'amount_minor', v_deal.amount_minor));
      perform mudra.sys_msg(v_deal.id, 'escrow', 'money locked in escrow', jsonb_build_object('amount_minor', v_deal.amount_minor, 'currency', v_deal.currency, 'voucher_hash', v_vhash));
      v_changed := true;

    elsif v_deal.state = 'FUNDED' and v_deal.inspection_mode is null and v_deal.updated_at < now() - interval '60 seconds' then
      if not exists (select 1 from mudra.messages where deal_id = v_deal.id and sender_id = v_bot.id and quick_key = 'show_live') then
        insert into mudra.messages(deal_id, sender_id, kind, body, quick_key, lang)
        values (v_deal.id, v_bot.id, 'quick', 'can you show it live?', 'show_live', v_bot.locale);
        v_deal.seller_unread := v_deal.seller_unread + 1;
        v_changed := true;
      end if;

    elsif v_deal.state = 'INSPECTION_LIVE' then
      if not exists (
        select 1 from jsonb_array_elements(v_deal.checklist) el
         where el->>'photo_url' is null or btrim(el->>'photo_url') = ''
      ) and jsonb_array_length(v_deal.checklist) > 0 then
        v_deal.state := 'ASSAY_VERIFIED';
        perform mudra.voucher(v_deal.id, 'ASSAY_VERIFIED', jsonb_build_object('buyer_id', v_bot.id, 'mode', 'live'));
        perform mudra.sys_msg(v_deal.id, 'system', 'live check verified by buyer');
        v_changed := true;
      end if;

    elsif v_deal.state = 'ASSAY_VERIFIED' then
      if v_deal.escrow_locked_minor > 0 then
        perform mudra.wallet_move(v_deal.seller_id, v_deal.currency, v_deal.escrow_locked_minor, 'escrow_release', v_deal.id, 'released from ' || v_deal.short_code);
      end if;
      update mudra.listings set status = 'sold', updated_at = now() where id = v_deal.listing_id;
      update mudra.profiles set deals_done = deals_done + 1 where id in (v_deal.buyer_id, v_deal.seller_id);
      v_deal.state := 'RELEASED';
      v_vhash := mudra.voucher(v_deal.id, 'RELEASED', jsonb_build_object('buyer_id', v_bot.id, 'seller_id', v_deal.seller_id, 'amount_minor', v_deal.escrow_locked_minor));
      perform mudra.sys_msg(v_deal.id, 'receipt', 'money released to seller', jsonb_build_object('amount_minor', v_deal.escrow_locked_minor, 'currency', v_deal.currency, 'voucher_hash', v_vhash));
      v_changed := true;

    elsif v_deal.state = 'RELEASED' and not v_deal.buyer_reviewed then
      insert into mudra.reviews(deal_id, author_id, subject_id, stars, body, tags)
      values (v_deal.id, v_bot.id, v_me.id, 5, 'as described, smooth deal', array['as described','on time'])
      on conflict (deal_id, author_id) do nothing;
      update mudra.profiles set rating_sum = rating_sum + 5, rating_count = rating_count + 1 where id = v_me.id;
      v_deal.buyer_reviewed := true;
      perform mudra.sys_msg(v_deal.id, 'system', 'left a 5-star review');
      v_changed := true;
    end if;
  end if;

  -- Friendly reply if user sent the latest text/quick message
  if not v_changed then
    select * into v_last_msg
      from mudra.messages
     where deal_id = v_deal.id
     order by id desc
     limit 1;

    if v_last_msg.sender_id = v_me.id and v_last_msg.kind in ('text','quick') then
      v_reply := v_canned[(v_last_msg.id % 5) + 1];
      insert into mudra.messages(deal_id, sender_id, kind, body, lang)
      values (v_deal.id, v_bot.id, 'text', v_reply, v_bot.locale);
      if v_me.id = v_deal.buyer_id then
        v_deal.buyer_unread := v_deal.buyer_unread + 1;
      else
        v_deal.seller_unread := v_deal.seller_unread + 1;
      end if;
      v_changed := true;
    end if;
  end if;

  if v_changed then
    update mudra.deals
       set amount_minor = v_deal.amount_minor,
           state = v_deal.state,
           version = v_deal.version + 1,
           offer_by = v_deal.offer_by,
           inspection_mode = v_deal.inspection_mode,
           checklist = v_deal.checklist,
           escrow_locked_minor = v_deal.escrow_locked_minor,
           buyer_unread = v_deal.buyer_unread,
           seller_unread = v_deal.seller_unread,
           buyer_reviewed = v_deal.buyer_reviewed,
           seller_reviewed = v_deal.seller_reviewed,
           updated_at = now()
     where id = v_deal.id
     returning * into v_deal;

    perform mudra.emit(v_me.id, v_deal.id, 'deal_tick');
  end if;

  return mudra.deal_json(v_deal, v_me.id);
end $$;

-- ============================================================================
-- 27. m_wallet, 28. m_topup_demo, 29. m_report, 30. m_reset_demo
-- ============================================================================
create or replace function public.m_wallet(p_token text) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_wallet mudra.wallets;
  v_balances jsonb;
  v_tx jsonb;
begin
  v_me := mudra.auth(p_token);

  insert into mudra.wallets(profile_id, currency, balance_minor)
  values (v_me.id, v_me.currency, 0)
  on conflict (profile_id, currency) do nothing;

  select * into v_wallet
    from mudra.wallets
   where profile_id = v_me.id and currency = v_me.currency;

  select coalesce(jsonb_agg(jsonb_build_object(
    'currency', w.currency,
    'balance_minor', w.balance_minor,
    'topups_today', case when w.topup_day = current_date then w.topups_today else 0 end
  )), '[]'::jsonb)
    into v_balances
    from mudra.wallets w
   where w.profile_id = v_me.id;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.id desc), '[]'::jsonb)
    into v_tx
    from (
      select *
        from mudra.wallet_tx
       where profile_id = v_me.id
       order by id desc
       limit 50
    ) t;

  return jsonb_build_object(
    'currency', v_me.currency,
    'balance_minor', v_wallet.balance_minor,
    'topups_today', case when v_wallet.topup_day = current_date then v_wallet.topups_today else 0 end,
    'balances', v_balances,
    'transactions', v_tx
  );
end $$;

create or replace function public.m_topup_demo(p_token text) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_wallet mudra.wallets;
  v_today_count int;
  v_amt bigint;
begin
  v_me := mudra.auth(p_token);

  insert into mudra.wallets(profile_id, currency, balance_minor)
  values (v_me.id, v_me.currency, 0)
  on conflict (profile_id, currency) do nothing;

  select * into v_wallet
    from mudra.wallets
   where profile_id = v_me.id and currency = v_me.currency
   for update;

  v_today_count := case when v_wallet.topup_day = current_date then v_wallet.topups_today else 0 end;
  if v_today_count >= 3 then
    raise exception 'MUDRA:RATE_LIMIT:max 3 demo top-ups per day';
  end if;

  v_amt := mudra.signup_bonus_for(v_me.currency) / 5;
  perform mudra.wallet_move(v_me.id, v_me.currency, v_amt, 'topup', null, 'demo credits top-up');

  update mudra.wallets
     set topups_today = v_today_count + 1,
         topup_day = current_date
   where profile_id = v_me.id and currency = v_me.currency;

  return public.m_wallet(p_token);
end $$;

create or replace function public.m_report(
  p_token text,
  p_target jsonb,
  p_reason text,
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  v_me := mudra.auth(p_token);
  if v_reason = '' then
    raise exception 'MUDRA:VALIDATION:reason is required';
  end if;

  insert into mudra.reports(reporter_id, listing_id, deal_id, profile_id, reason, note)
  values (
    v_me.id,
    case when p_target ? 'listing_id' and p_target->>'listing_id' is not null then (p_target->>'listing_id')::uuid else null end,
    case when p_target ? 'deal_id' and p_target->>'deal_id' is not null then (p_target->>'deal_id')::uuid else null end,
    case when p_target ? 'profile_id' and p_target->>'profile_id' is not null then (p_target->>'profile_id')::uuid else null end,
    v_reason,
    left(nullif(btrim(coalesce(p_note, '')), ''), 500)
  );

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.m_reset_demo(p_token text) returns jsonb
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_me mudra.profiles;
begin
  v_me := mudra.auth(p_token);
  if not coalesce(v_me.is_demo_account, false) then
    raise exception 'MUDRA:FORBIDDEN:reset is only available for demo accounts';
  end if;

  perform mudra.seed_demo_for(v_me.id);
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================
-- Grants & Revokes
-- ============================================================================
grant execute on function public.m_ping() to anon, authenticated;
grant execute on function public.m_signup(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.m_login(text, text, text) to anon, authenticated;
grant execute on function public.m_logout(text) to anon, authenticated;
grant execute on function public.m_me(text) to anon, authenticated;
grant execute on function public.m_update_profile(text, jsonb) to anon, authenticated;
grant execute on function public.m_change_pin(text, text, text) to anon, authenticated;
grant execute on function public.m_delete_account(text, text) to anon, authenticated;
grant execute on function public.m_feed(text, jsonb, int, int) to anon, authenticated;
grant execute on function public.m_listing(text, uuid) to anon, authenticated;
grant execute on function public.m_create_listing(text, jsonb) to anon, authenticated;
grant execute on function public.m_update_listing(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.m_set_listing_status(text, uuid, text) to anon, authenticated;
grant execute on function public.m_my_listings(text) to anon, authenticated;
grant execute on function public.m_toggle_save(text, uuid) to anon, authenticated;
grant execute on function public.m_saved(text) to anon, authenticated;
grant execute on function public.m_seller_profile(text, uuid) to anon, authenticated;
grant execute on function public.m_start_deal(text, uuid, bigint, text, text, text) to anon, authenticated;
grant execute on function public.m_deal_action(text, uuid, text, int, jsonb, text) to anon, authenticated;
grant execute on function public.m_deals(text, text) to anon, authenticated;
grant execute on function public.m_deal(text, uuid) to anon, authenticated;
grant execute on function public.m_messages(text, uuid, bigint) to anon, authenticated;
grant execute on function public.m_send_message(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.m_translate_message(text, bigint, text) to anon, authenticated;
grant execute on function public.m_resolve_if_due(text, uuid) to anon, authenticated;
grant execute on function public.m_demo_tick(text, uuid) to anon, authenticated;
grant execute on function public.m_wallet(text) to anon, authenticated;
grant execute on function public.m_topup_demo(text) to anon, authenticated;
grant execute on function public.m_report(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.m_reset_demo(text) to anon, authenticated;

revoke all on all tables in schema mudra from anon, authenticated;
revoke all on all sequences in schema mudra from anon, authenticated;
revoke all on all functions in schema mudra from anon, authenticated;
revoke usage on schema mudra from anon, authenticated;

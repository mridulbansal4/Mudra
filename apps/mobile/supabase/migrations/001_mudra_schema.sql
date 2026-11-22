-- 001_mudra_schema.sql
-- MUDRA Android App Schema & Internal Helper Functions (§8.1, §8.2)

create schema if not exists mudra;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Ensure public.m_events exists early so mudra.emit can reference it safely
create table if not exists public.m_events (
  id bigserial primary key,
  recipient_id uuid not null,
  deal_id uuid,
  kind text not null,
  created_at timestamptz not null default now()
);

-- Non-transactional sequence pool for persisting failed_pin_attempts across RAISE EXCEPTION in m_login
do $$
declare
  i int;
begin
  for i in 0..255 loop
    execute format('create sequence if not exists mudra.pin_slot_%s minvalue 1 start with 1', i);
  end loop;
end $$;

create table if not exists mudra.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  pin_hash text not null,
  primary_role text not null default 'both' check (primary_role in ('buy','sell','both')),
  locale text not null default 'en' check (locale in ('en','hi','ta','mr','es')),
  currency text not null default 'INR' check (currency in ('INR','USD','EUR','GBP','SGD','AED','CAD','AUD')),
  campus text check (char_length(campus) <= 60),
  bio text check (char_length(bio) <= 200),
  avatar_hue int not null default (floor(random()*360))::int,
  rating_sum int not null default 0,
  rating_count int not null default 0,
  deals_done int not null default 0,
  is_demo_bot boolean not null default false,
  is_demo_account boolean not null default false,
  failed_pin_attempts int not null default 0,
  locked_until timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists mudra.sessions (
  token_hash text primary key,
  profile_id uuid not null references mudra.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);

create table if not exists mudra.wallets (
  profile_id uuid not null references mudra.profiles(id) on delete cascade,
  currency text not null,
  balance_minor bigint not null default 0 check (balance_minor >= 0),
  topups_today int not null default 0,
  topup_day date,
  primary key (profile_id, currency)
);

create table if not exists mudra.wallet_tx (
  id bigserial primary key,
  profile_id uuid not null references mudra.profiles(id) on delete cascade,
  currency text not null,
  amount_minor bigint not null,
  kind text not null check (kind in ('signup_bonus','topup','escrow_lock','escrow_release','refund','split','reset')),
  deal_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists mudra.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references mudra.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  category text not null check (category in ('books','electronics','phones','home','rides','fashion','sports','hobbies','tickets','other')),
  condition text not null check (condition in ('new','like_new','good','fair')),
  kind text not null check (kind in ('sell','swap','free')),
  price_minor bigint not null default 0,
  currency text not null,
  photos text[] not null check (array_length(photos,1) between 1 and 6),
  meetup_spot text check (char_length(meetup_spot) <= 80),
  campus text,
  status text not null default 'active' check (status in ('active','reserved','sold','removed')),
  search tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'sell' and price_minor > 0) or (kind <> 'sell' and price_minor = 0))
);
create index if not exists listings_feed_idx on mudra.listings (status, created_at desc);
create index if not exists listings_search_idx on mudra.listings using gin (search);
create index if not exists listings_title_trgm on mudra.listings using gin (title extensions.gin_trgm_ops);

create table if not exists mudra.saves (
  profile_id uuid references mudra.profiles(id) on delete cascade,
  listing_id uuid references mudra.listings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (profile_id, listing_id)
);

create sequence if not exists mudra.deal_seq;

create table if not exists mudra.deals (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,
  listing_id uuid not null references mudra.listings(id) on delete cascade,
  buyer_id uuid not null references mudra.profiles(id) on delete cascade,
  seller_id uuid not null references mudra.profiles(id) on delete cascade,
  kind text not null,
  amount_minor bigint not null default 0,
  currency text not null,
  swap_offer text,
  state text not null default 'OFFERED' check (state in ('OFFERED','CREATED','FUNDED','INSPECTION_LIVE','ASSAY_VERIFIED','RELEASED','DISPUTED_FROZEN','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED')),
  version int not null default 1,
  offer_by uuid not null,
  inspection_mode text check (inspection_mode in ('live','in_person')),
  checklist jsonb not null default '[]',
  escrow_locked_minor bigint not null default 0,
  verified_before_freeze boolean not null default false,
  frozen_from_state text,
  frozen_at timestamptz,
  freeze_ends_at timestamptz,
  frozen_by uuid,
  buyer_statement text,
  seller_statement text,
  verdict jsonb,
  buyer_unread int not null default 0,
  seller_unread int not null default 0,
  buyer_reviewed boolean not null default false,
  seller_reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists deals_one_open_per_buyer on mudra.deals (listing_id, buyer_id)
  where state not in ('RELEASED','ARBITRATED_SPLIT','REFUNDED','DECLINED','CANCELLED');
create index if not exists deals_buyer_idx on mudra.deals (buyer_id, updated_at desc);
create index if not exists deals_seller_idx on mudra.deals (seller_id, updated_at desc);

create table if not exists mudra.messages (
  id bigserial primary key,
  deal_id uuid not null references mudra.deals(id) on delete cascade,
  sender_id uuid,
  kind text not null check (kind in ('text','quick','offer','system','escrow','receipt','verdict','evidence')),
  body text not null default '',
  quick_key text,
  payload jsonb not null default '{}',
  lang text not null default 'en',
  translations jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists messages_deal_idx on mudra.messages (deal_id, id);

create table if not exists mudra.vouchers (
  id bigserial primary key,
  deal_id uuid not null references mudra.deals(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz not null default now()
);

create or replace function mudra.vouchers_no_update() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('mudra.allow_reset', true) = '1' then
    return old;
  end if;
  raise exception 'MUDRA:FORBIDDEN:vouchers are append-only';
end $$;

drop trigger if exists vouchers_append_only on mudra.vouchers;
create trigger vouchers_append_only before update or delete on mudra.vouchers
  for each row execute function mudra.vouchers_no_update();

create table if not exists mudra.reviews (
  id bigserial primary key,
  deal_id uuid not null references mudra.deals(id) on delete cascade,
  author_id uuid not null references mudra.profiles(id) on delete cascade,
  subject_id uuid not null references mudra.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  body text check (char_length(body) <= 200),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (deal_id, author_id)
);

create table if not exists mudra.reports (
  id bigserial primary key,
  reporter_id uuid,
  listing_id uuid,
  deal_id uuid,
  profile_id uuid,
  reason text not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists mudra.idempotency (
  key text primary key,
  profile_id uuid not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists mudra.secrets (
  key text primary key,
  value text not null
);

-- ============================================================================
-- §8.2 Internal Helper Functions (schema mudra)
-- ============================================================================

create or replace function mudra.signup_bonus_for(p_currency text) returns bigint
language sql immutable as $$
  select case upper(coalesce(p_currency, 'INR'))
    when 'INR' then 2500000::bigint
    when 'USD' then 30000::bigint
    when 'EUR' then 30000::bigint
    when 'GBP' then 25000::bigint
    when 'SGD' then 40000::bigint
    when 'AED' then 110000::bigint
    when 'CAD' then 40000::bigint
    when 'AUD' then 45000::bigint
    else 30000::bigint
  end;
$$;

create or replace function mudra.new_token() returns text
language sql volatile as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

create or replace function mudra.auth(p_token text) returns mudra.profiles
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_hash text;
  v_sess mudra.sessions;
  v_prof mudra.profiles;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'MUDRA:AUTH:missing session token';
  end if;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  select * into v_sess
    from mudra.sessions
   where token_hash = v_hash
     and expires_at > now();
  if not found then
    raise exception 'MUDRA:AUTH:invalid or expired session';
  end if;
  select * into v_prof
    from mudra.profiles
   where id = v_sess.profile_id
     and deleted_at is null;
  if not found then
    raise exception 'MUDRA:AUTH:account not found';
  end if;
  if v_sess.last_seen_at < now() - interval '1 minute' then
    update mudra.sessions set last_seen_at = now() where token_hash = v_hash;
  end if;
  return v_prof;
end $$;

create or replace function mudra.auth_opt(p_token text) returns mudra.profiles
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_hash text;
  v_sess mudra.sessions;
  v_prof mudra.profiles;
begin
  if p_token is null or btrim(p_token) = '' then
    return null;
  end if;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  select * into v_sess
    from mudra.sessions
   where token_hash = v_hash
     and expires_at > now();
  if not found then
    return null;
  end if;
  select * into v_prof
    from mudra.profiles
   where id = v_sess.profile_id
     and deleted_at is null;
  if not found then
    return null;
  end if;
  return v_prof;
end $$;

create or replace function mudra.emit(p_recipient uuid, p_deal uuid, p_kind text) returns void
language plpgsql security definer set search_path = mudra, public, extensions as $$
begin
  if p_recipient is not null then
    insert into public.m_events(recipient_id, deal_id, kind)
    values (p_recipient, p_deal, p_kind);
  end if;
end $$;

create or replace function mudra.voucher(p_deal uuid, p_event text, p_payload jsonb) returns text
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_prev text;
  v_hash text;
  v_pay jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  select hash into v_prev
    from mudra.vouchers
   where deal_id = p_deal
   order by id desc
   limit 1;
  if v_prev is null then
    v_prev := 'genesis';
  end if;
  v_hash := encode(extensions.digest(v_prev || p_event || v_pay::text, 'sha256'), 'hex');
  insert into mudra.vouchers(deal_id, event, payload, prev_hash, hash)
  values (p_deal, p_event, v_pay, v_prev, v_hash);
  return v_hash;
end $$;

create or replace function mudra.wallet_move(
  p_profile uuid,
  p_currency text,
  p_amount bigint,
  p_kind text,
  p_deal uuid default null,
  p_note text default null
) returns bigint
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_bal bigint;
begin
  insert into mudra.wallets(profile_id, currency, balance_minor)
  values (p_profile, p_currency, 0)
  on conflict (profile_id, currency) do nothing;

  select balance_minor into v_bal
    from mudra.wallets
   where profile_id = p_profile and currency = p_currency
   for update;

  if v_bal + p_amount < 0 then
    raise exception 'MUDRA:INSUFFICIENT_FUNDS:not enough demo credits';
  end if;

  update mudra.wallets
     set balance_minor = balance_minor + p_amount
   where profile_id = p_profile and currency = p_currency
   returning balance_minor into v_bal;

  insert into mudra.wallet_tx(profile_id, currency, amount_minor, kind, deal_id, note)
  values (p_profile, p_currency, p_amount, p_kind, p_deal, p_note);

  return v_bal;
end $$;

create or replace function mudra.sys_msg(
  p_deal uuid,
  p_kind text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
) returns mudra.messages
language plpgsql security definer set search_path = mudra, public, extensions as $$
declare
  v_msg mudra.messages;
begin
  insert into mudra.messages(deal_id, sender_id, kind, body, payload, lang)
  values (p_deal, null, p_kind, coalesce(p_body, ''), coalesce(p_payload, '{}'::jsonb), 'en')
  returning * into v_msg;

  update mudra.deals
     set buyer_unread = buyer_unread + 1,
         seller_unread = seller_unread + 1
   where id = p_deal;

  return v_msg;
end $$;

create or replace function mudra.scrub_pii(t text) returns text
language plpgsql immutable as $$
declare
  v_out text := coalesce(t, '');
begin
  -- 12-digit Aadhaar
  v_out := regexp_replace(v_out, '\m\d{4}\s?\d{4}\s?\d{4}\M', '•••', 'g');
  -- Phone numbers (10+ digits with optional +, spaces, dashes)
  v_out := regexp_replace(v_out, '\+?\d[\d\s\-]{8,}\d', '•••', 'g');
  -- Emails & UPI handles
  v_out := regexp_replace(v_out, '\S+@[A-Za-z0-9._\-]+', '•••', 'g');
  -- PAN
  v_out := regexp_replace(v_out, '[A-Z]{5}[0-9]{4}[A-Z]', '•••', 'g');
  return v_out;
end $$;

create or replace function mudra.checklist_for(p_category text) returns jsonb
language sql immutable as $$
  select case lower(coalesce(p_category, 'other'))
    when 'phones' then jsonb_build_array(
      jsonb_build_object('label', 'show it powered on', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show the screen / display working', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show ports, edges and any scratches', 'photo_url', null, 'at', null)
    )
    when 'electronics' then jsonb_build_array(
      jsonb_build_object('label', 'show it powered on', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show the screen / display working', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show ports, edges and any scratches', 'photo_url', null, 'at', null)
    )
    when 'books' then jsonb_build_array(
      jsonb_build_object('label', 'show the cover', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show a random inside page', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show spine and corners', 'photo_url', null, 'at', null)
    )
    when 'rides' then jsonb_build_array(
      jsonb_build_object('label', 'show the frame and serial area', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show brakes and tyres', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show it moving or the chain', 'photo_url', null, 'at', null)
    )
    when 'fashion' then jsonb_build_array(
      jsonb_build_object('label', 'show the front', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show the label / size tag', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show any wear or marks', 'photo_url', null, 'at', null)
    )
    else jsonb_build_array(
      jsonb_build_object('label', 'show the whole item', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show it working or its key detail', 'photo_url', null, 'at', null),
      jsonb_build_object('label', 'show any damage', 'photo_url', null, 'at', null)
    )
  end;
$$;

create or replace function mudra.allowed_actions(d mudra.deals, me uuid) returns text[]
language plpgsql immutable as $$
declare
  is_buyer boolean;
  is_seller boolean;
begin
  if me is null or (me <> d.buyer_id and me <> d.seller_id) then
    return '{}'::text[];
  end if;
  is_buyer := (me = d.buyer_id);
  is_seller := (me = d.seller_id);

  case d.state
    when 'OFFERED' then
      if d.offer_by = me then
        return array['CANCEL'];
      else
        return array['ACCEPT', 'COUNTER', 'DECLINE'];
      end if;
    when 'CREATED' then
      if is_buyer then
        return array['LOCK_ESCROW', 'CANCEL'];
      else
        return array['CANCEL'];
      end if;
    when 'FUNDED' then
      if is_seller then
        return array['START_ASSAY', 'RAISE_DISPUTE', 'CANCEL'];
      else
        return array['CHOOSE_IN_PERSON', 'CONFIRM_IN_PERSON', 'RAISE_DISPUTE'];
      end if;
    when 'INSPECTION_LIVE' then
      if is_seller then
        return array['CHECK_ITEM', 'RAISE_DISPUTE'];
      else
        return array['MARK_ASSAY_VERIFIED', 'RAISE_DISPUTE'];
      end if;
    when 'ASSAY_VERIFIED' then
      if is_buyer then
        return array['RELEASE_FUNDS', 'RAISE_DISPUTE'];
      else
        return '{}'::text[];
      end if;
    when 'DISPUTED_FROZEN' then
      if is_buyer and d.buyer_statement is null then
        return array['ADD_STATEMENT'];
      elsif is_seller and d.seller_statement is null then
        return array['ADD_STATEMENT'];
      else
        return '{}'::text[];
      end if;
    when 'RELEASED', 'ARBITRATED_SPLIT', 'REFUNDED' then
      if is_buyer and not d.buyer_reviewed then
        return array['LEAVE_REVIEW'];
      elsif is_seller and not d.seller_reviewed then
        return array['LEAVE_REVIEW'];
      else
        return '{}'::text[];
      end if;
    else
      return '{}'::text[];
  end case;
end $$;

create or replace function mudra.listing_card_json(l mudra.listings) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_seller mudra.profiles;
  v_rating numeric;
begin
  select * into v_seller from mudra.profiles where id = l.seller_id;
  if v_seller.rating_count > 0 then
    v_rating := round(v_seller.rating_sum::numeric / v_seller.rating_count::numeric, 1);
  else
    v_rating := null;
  end if;
  return jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'description', l.description,
    'price_minor', l.price_minor,
    'currency', l.currency,
    'kind', l.kind,
    'condition', l.condition,
    'category', l.category,
    'photo', l.photos[1],
    'photos', to_jsonb(l.photos),
    'campus', l.campus,
    'meetup_spot', l.meetup_spot,
    'status', l.status,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'seller', jsonb_build_object(
      'id', v_seller.id,
      'name', coalesce(v_seller.name, 'mudra user'),
      'avatar_hue', coalesce(v_seller.avatar_hue, 180),
      'campus', v_seller.campus,
      'deals_done', coalesce(v_seller.deals_done, 0),
      'rating', v_rating
    )
  );
end $$;

create or replace function mudra.deal_json(p_deal mudra.deals, p_me uuid) returns jsonb
language plpgsql stable security definer set search_path = mudra, public, extensions as $$
declare
  v_listing mudra.listings;
  v_other_id uuid;
  v_other mudra.profiles;
  v_my_role text;
  v_rating numeric;
  v_phone text := null;
  v_unread int := 0;
  v_reviewed boolean := false;
  v_stage int := 1;
  v_allowed text[];
  v_next jsonb;
  v_voucher_hash text;
begin
  select * into v_listing from mudra.listings where id = p_deal.listing_id;

  if p_me = p_deal.buyer_id then
    v_my_role := 'buyer';
    v_other_id := p_deal.seller_id;
    v_unread := p_deal.buyer_unread;
    v_reviewed := p_deal.buyer_reviewed;
  else
    v_my_role := 'seller';
    v_other_id := p_deal.buyer_id;
    v_unread := p_deal.seller_unread;
    v_reviewed := p_deal.seller_reviewed;
  end if;

  select * into v_other from mudra.profiles where id = v_other_id;
  if v_other.rating_count > 0 then
    v_rating := round(v_other.rating_sum::numeric / v_other.rating_count::numeric, 1);
  else
    v_rating := null;
  end if;

  if p_deal.state not in ('OFFERED','CREATED','DECLINED','CANCELLED') then
    v_phone := v_other.phone_e164;
  end if;

  v_stage := case
    when p_deal.state in ('OFFERED','CREATED') then 1
    when p_deal.state = 'FUNDED' then 2
    when p_deal.state in ('INSPECTION_LIVE','ASSAY_VERIFIED','DISPUTED_FROZEN') then 3
    else 4
  end;

  v_allowed := mudra.allowed_actions(p_deal, p_me);

  v_next := case p_deal.state
    when 'OFFERED' then
      case
        when p_deal.offer_by = p_me then jsonb_build_object('text_key', 'waiting_response', 'action', 'CANCEL')
        when v_my_role = 'buyer' then jsonb_build_object('text_key', 'countered_offer', 'action', 'ACCEPT')
        else jsonb_build_object('text_key', 'received_offer', 'action', 'ACCEPT')
      end
    when 'CREATED' then
      case
        when v_my_role = 'buyer' then jsonb_build_object('text_key', 'lock_escrow_prompt', 'action', 'LOCK_ESCROW')
        else jsonb_build_object('text_key', 'waiting_buyer_lock', 'action', null)
      end
    when 'FUNDED' then
      case
        when p_deal.inspection_mode = 'in_person' and v_my_role = 'buyer' then
          jsonb_build_object('text_key', 'confirm_in_person', 'action', 'CONFIRM_IN_PERSON')
        when p_deal.inspection_mode = 'in_person' and v_my_role = 'seller' then
          jsonb_build_object('text_key', 'meet_in_person', 'action', null)
        when v_my_role = 'buyer' then
          jsonb_build_object('text_key', 'choose_inspection', 'action', 'CHOOSE_IN_PERSON')
        else
          jsonb_build_object('text_key', 'start_live_check', 'action', 'START_ASSAY')
      end
    when 'INSPECTION_LIVE' then
      case
        when v_my_role = 'buyer' then jsonb_build_object('text_key', 'mark_verified_prompt', 'action', 'MARK_ASSAY_VERIFIED')
        else jsonb_build_object('text_key', 'capture_next_check', 'action', 'CHECK_ITEM')
      end
    when 'ASSAY_VERIFIED' then
      case
        when v_my_role = 'buyer' then jsonb_build_object('text_key', 'release_money_prompt', 'action', 'RELEASE_FUNDS')
        else jsonb_build_object('text_key', 'waiting_buyer_release', 'action', null)
      end
    when 'DISPUTED_FROZEN' then
      jsonb_build_object('text_key', 'frozen_countdown', 'action', 'OPEN_FREEZE')
    when 'RELEASED' then
      case
        when not v_reviewed then jsonb_build_object('text_key', 'leave_review_prompt', 'action', 'LEAVE_REVIEW')
        else jsonb_build_object('text_key', 'deal_completed', 'action', 'VIEW_RECEIPT')
      end
    when 'ARBITRATED_SPLIT' then
      jsonb_build_object('text_key', 'deal_resolved', 'action', 'VIEW_VERDICT')
    when 'REFUNDED' then
      jsonb_build_object('text_key', 'deal_resolved', 'action', 'VIEW_VERDICT')
    else
      jsonb_build_object('text_key', 'deal_closed', 'action', null)
  end;

  select hash into v_voucher_hash
    from mudra.vouchers
   where deal_id = p_deal.id
   order by id desc
   limit 1;

  return jsonb_build_object(
    'id', p_deal.id,
    'short_code', p_deal.short_code,
    'state', p_deal.state,
    'version', p_deal.version,
    'kind', p_deal.kind,
    'amount_minor', p_deal.amount_minor,
    'currency', p_deal.currency,
    'swap_offer', p_deal.swap_offer,
    'my_role', v_my_role,
    'buyer_id', p_deal.buyer_id,
    'seller_id', p_deal.seller_id,
    'listing', jsonb_build_object(
      'id', v_listing.id,
      'title', v_listing.title,
      'photo', v_listing.photos[1],
      'photos', to_jsonb(v_listing.photos),
      'category', v_listing.category,
      'status', v_listing.status,
      'price_minor', v_listing.price_minor,
      'currency', v_listing.currency,
      'kind', v_listing.kind,
      'meetup_spot', v_listing.meetup_spot,
      'campus', v_listing.campus
    ),
    'counterpart', jsonb_build_object(
      'id', v_other.id,
      'name', coalesce(v_other.name, 'mudra user'),
      'avatar_hue', coalesce(v_other.avatar_hue, 180),
      'rating', v_rating,
      'deals_done', coalesce(v_other.deals_done, 0),
      'is_demo_bot', coalesce(v_other.is_demo_bot, false),
      'campus', v_other.campus,
      'phone', v_phone
    ),
    'offer_by', p_deal.offer_by,
    'offer_by_me', (p_deal.offer_by = p_me),
    'inspection_mode', p_deal.inspection_mode,
    'checklist', p_deal.checklist,
    'escrow_locked_minor', p_deal.escrow_locked_minor,
    'verified_before_freeze', p_deal.verified_before_freeze,
    'frozen_from_state', p_deal.frozen_from_state,
    'frozen_at', p_deal.frozen_at,
    'freeze_ends_at', p_deal.freeze_ends_at,
    'frozen_by', p_deal.frozen_by,
    'buyer_statement', p_deal.buyer_statement,
    'seller_statement', p_deal.seller_statement,
    'verdict', p_deal.verdict,
    'unread', v_unread,
    'reviewed_by_me', v_reviewed,
    'story_stage', v_stage,
    'allowed_actions', to_jsonb(v_allowed),
    'next_step', v_next,
    'latest_voucher_hash', v_voucher_hash,
    'server_now', now(),
    'created_at', p_deal.created_at,
    'updated_at', p_deal.updated_at
  );
end $$;

revoke all on all tables in schema mudra from anon, authenticated;
revoke all on all sequences in schema mudra from anon, authenticated;
revoke all on all functions in schema mudra from anon, authenticated;
revoke usage on schema mudra from anon, authenticated;

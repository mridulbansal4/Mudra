-- 003_mudra_realtime_storage.sql
-- Realtime Event Table & Supabase Storage Bucket `mudra-photos` (ADR-M6, ADR-M7)

create table if not exists public.m_events (
  id bigserial primary key,
  recipient_id uuid not null,
  deal_id uuid,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists m_events_recipient_idx on public.m_events (recipient_id, id desc);
create index if not exists m_events_created_idx on public.m_events (created_at);

alter table public.m_events enable row level security;

drop policy if exists m_events_anon_select on public.m_events;
create policy m_events_anon_select on public.m_events
  for select to anon, authenticated
  using (true);

grant select on public.m_events to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'm_events'
  ) then
    alter publication supabase_realtime add table public.m_events;
  end if;
exception when others then
  raise notice 'supabase_realtime publication update skipped: %', sqlerrm;
end $$;

-- Storage bucket `mudra-photos` (public, 6 MB limit, jpeg/png/webp)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mudra-photos',
  'mudra-photos',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 6291456,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists mudra_photos_public_select on storage.objects;
create policy mudra_photos_public_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'mudra-photos');

drop policy if exists mudra_photos_anon_insert on storage.objects;
create policy mudra_photos_anon_insert on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'mudra-photos'
    and (storage.foldername(name))[1] in ('listings', 'evidence', 'avatars', 'seed')
  );

drop policy if exists mudra_photos_seed_update on storage.objects;
create policy mudra_photos_seed_update on storage.objects
  for update to anon, authenticated
  using (
    bucket_id = 'mudra-photos'
    and (storage.foldername(name))[1] in ('seed', 'listings', 'evidence', 'avatars')
  );

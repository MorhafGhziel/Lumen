-- =============================================================================
-- Lumen schema
-- =============================================================================
-- Paste this whole file into the Supabase SQL editor and run it.
--
-- Safe on a brand new project and safe to re-run on one that already has rows.
-- No DROP TABLE, no data loss.
--
-- IMPORTANT: the SQL editor runs a script as ONE transaction, so a single
-- failing statement rolls back everything before it. A few steps here touch
-- objects the editor role may not own (triggers on auth.users, policies on
-- storage.objects, the realtime publication). Those are wrapped so a
-- permission error is reported as a NOTICE and skipped, rather than undoing
-- the table changes that matter. Look at the Notices tab after running: if
-- something was skipped it will say so, and the app still works without it.
--
-- Order is deliberate. Everything the app needs to load at all comes first.
-- =============================================================================

create extension if not exists "pgcrypto";


-- =============================================================================
-- 1. Helpers
-- =============================================================================

-- Keeps updated_at honest. Previously the client sent this value, which meant
-- it drifted with clock skew and could be spoofed by any caller.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Short, URL-safe, unguessable share token.
create or replace function public.generate_share_id()
returns text
language sql
volatile
as $$
  select replace(replace(encode(gen_random_bytes(12), 'base64'), '/', '_'), '+', '-');
$$;


-- =============================================================================
-- 2. Folders
-- =============================================================================

create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default 'New folder',
  parent_id  uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Columns the original schema lacked. is_open was hardcoded to true in the
-- client, so collapsing a folder never survived a reload.
alter table public.folders add column if not exists is_open    boolean not null default true;
alter table public.folders add column if not exists sort_order integer not null default 0;
alter table public.folders add column if not exists updated_at timestamptz not null default now();

alter table public.folders enable row level security;

drop policy if exists "Users manage own folders" on public.folders;
drop policy if exists "folders_all_own" on public.folders;
create policy "folders_all_own" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists folders_touch on public.folders;
create trigger folders_touch before update on public.folders
  for each row execute function public.touch_updated_at();

create index if not exists folders_user_id_idx on public.folders (user_id, sort_order, created_at);


-- =============================================================================
-- 3. Pages
-- =============================================================================

create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  icon        text not null default 'file',
  folder_id   uuid references public.folders(id) on delete set null,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.pages add column if not exists cover_url  text;
alter table public.pages add column if not exists is_public  boolean not null default false;
alter table public.pages add column if not exists share_id   text;
alter table public.pages add column if not exists sort_order integer not null default 0;

-- Give every page a share token up front. The old client generated one with
-- Math.random() (8 chars, predictable) only at the moment of sharing; this is
-- 96 bits of CSPRNG entropy and exists before it is ever needed.
update public.pages set share_id = public.generate_share_id() where share_id is null;

alter table public.pages alter column share_id set default public.generate_share_id();
alter table public.pages alter column share_id set not null;

create unique index if not exists pages_share_id_key on public.pages (share_id);

alter table public.pages enable row level security;

-- The v1 "FOR ALL" policy and the v2 public-read policy overlapped. Split into
-- four explicit policies so each verb is obvious.
drop policy if exists "Users manage own pages" on public.pages;
drop policy if exists "Anyone can read public pages" on public.pages;
drop policy if exists "pages_select_own_or_public" on public.pages;
drop policy if exists "pages_insert_own" on public.pages;
drop policy if exists "pages_update_own" on public.pages;
drop policy if exists "pages_delete_own" on public.pages;

create policy "pages_select_own_or_public" on public.pages
  for select using (auth.uid() = user_id or is_public = true);

create policy "pages_insert_own" on public.pages
  for insert with check (auth.uid() = user_id);

create policy "pages_update_own" on public.pages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "pages_delete_own" on public.pages
  for delete using (auth.uid() = user_id);

drop trigger if exists pages_touch on public.pages;
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

create index if not exists pages_user_id_idx   on public.pages (user_id, updated_at desc);
create index if not exists pages_folder_id_idx on public.pages (folder_id);
create index if not exists pages_favorite_idx  on public.pages (user_id) where is_favorite;
create index if not exists pages_public_idx    on public.pages (share_id) where is_public;


-- =============================================================================
-- 4. Sticky notes
-- =============================================================================

create table if not exists public.sticky_notes (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text    text not null default '',
  color   text not null default 'butter',
  x       double precision not null default 0,
  y       double precision not null default 0,
  width   double precision not null default 220,
  height  double precision not null default 160
);

alter table public.sticky_notes add column if not exists z_index    integer not null default 0;
alter table public.sticky_notes add column if not exists created_at timestamptz not null default now();
alter table public.sticky_notes add column if not exists updated_at timestamptz not null default now();

-- The palette was renamed to paper stocks. Map the old names across so existing
-- notes keep a valid colour instead of falling back to a default.
update public.sticky_notes set color = case color
  when 'yellow' then 'butter'
  when 'pink'   then 'blush'
  when 'blue'   then 'sky'
  when 'green'  then 'sage'
  when 'purple' then 'lilac'
  when 'orange' then 'clay'
  else color
end
where color in ('yellow', 'pink', 'blue', 'green', 'purple', 'orange');

alter table public.sticky_notes enable row level security;

drop policy if exists "Users manage own notes" on public.sticky_notes;
drop policy if exists "sticky_notes_all_own" on public.sticky_notes;
create policy "sticky_notes_all_own" on public.sticky_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists sticky_notes_touch on public.sticky_notes;
create trigger sticky_notes_touch before update on public.sticky_notes
  for each row execute function public.touch_updated_at();

create index if not exists sticky_notes_user_id_idx on public.sticky_notes (user_id);


-- =============================================================================
-- 5. Drawing strokes
-- =============================================================================

create table if not exists public.drawing_strokes (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool    text not null default 'pen',
  points  jsonb not null default '[]'::jsonb,
  color   text not null default '#1a1714',
  size    double precision not null default 3,
  opacity double precision not null default 1
);

-- Without a timestamp there is no stable stroke order, so redrawing the board
-- could reorder overlapping strokes.
alter table public.drawing_strokes add column if not exists created_at timestamptz not null default now();

alter table public.drawing_strokes enable row level security;

drop policy if exists "Users manage own strokes" on public.drawing_strokes;
drop policy if exists "drawing_strokes_all_own" on public.drawing_strokes;
create policy "drawing_strokes_all_own" on public.drawing_strokes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists drawing_strokes_user_id_idx on public.drawing_strokes (user_id, created_at);


-- =============================================================================
-- 6. Comments
-- =============================================================================

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.pages(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  content    text not null default '',
  created_at timestamptz not null default now()
);

alter table public.comments add column if not exists author_name text not null default 'Anonymous';

-- Carry over the old user_email column if this database still has one.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comments' and column_name = 'user_email'
  ) then
    update public.comments
      set author_name = split_part(user_email, '@', 1)
      where author_name = 'Anonymous' and user_email is not null and user_email <> '';
  end if;
end
$$;

-- user_id must be nullable so a reader of a public page can comment without an
-- account. The original NOT NULL made that impossible.
alter table public.comments alter column user_id drop not null;

-- Anyone may comment on a public page, including signed-out readers, so the
-- size limits have to live in the database rather than only in the form.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'comments_content_length') then
    alter table public.comments
      add constraint comments_content_length check (char_length(content) <= 4000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'comments_author_name_length') then
    alter table public.comments
      add constraint comments_author_name_length check (char_length(author_name) <= 60);
  end if;
end
$$;

alter table public.comments enable row level security;

drop policy if exists "Users manage own comments" on public.comments;
drop policy if exists "Anyone can read comments on public pages" on public.comments;
drop policy if exists "comments_select" on public.comments;
drop policy if exists "comments_insert" on public.comments;
drop policy if exists "comments_delete" on public.comments;

-- Readable by the page owner, or by anyone if the page is public.
create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.pages p
      where p.id = comments.page_id
        and (p.user_id = auth.uid() or p.is_public = true)
    )
  );

-- Writable by the page owner, or by anyone on a public page. The author must
-- be honest about who they are: user_id is either null or your own id.
create policy "comments_insert" on public.comments
  for insert with check (
    (user_id is null or user_id = auth.uid())
    and exists (
      select 1 from public.pages p
      where p.id = comments.page_id
        and (p.user_id = auth.uid() or p.is_public = true)
    )
  );

-- Deletable by the comment author or by the owner of the page it sits on.
create policy "comments_delete" on public.comments
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.pages p
      where p.id = comments.page_id and p.user_id = auth.uid()
    )
  );

create index if not exists comments_page_id_idx on public.comments (page_id, created_at);


-- =============================================================================
-- 7. Profiles
-- =============================================================================
-- Reading display names straight off auth.users requires elevated privileges,
-- so mirror the few public fields into a table the app can query.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'there'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill anyone who already exists. This works regardless of whether the
-- trigger below can be installed.
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, 'there'), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- Creating a trigger on auth.users needs ownership of that table, which the
-- SQL editor role does not always have. Guarded so a refusal cannot roll back
-- everything above it. Without the trigger, the app falls back to auth
-- metadata for the display name, so nothing visibly breaks.
do $$
begin
  execute 'drop trigger if exists on_auth_user_created on auth.users';
  execute 'create trigger on_auth_user_created after insert on auth.users '
       || 'for each row execute function public.handle_new_user()';
  raise notice 'Installed the auth.users signup trigger.';
exception when others then
  raise notice 'SKIPPED the auth.users trigger (%). Profiles are backfilled above; new signups fall back to auth metadata. Nothing else is affected.', sqlerrm;
end
$$;


-- =============================================================================
-- 8. Storage
-- =============================================================================
-- Guarded: policies on storage.objects require ownership the editor role may
-- not have. If this is skipped, create the bucket by hand under Storage and
-- image upload will work; everything else is unaffected.

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'images', 'images', true,
    5242880,  -- 5 MB, comfortably inside the free tier's 1 GB total
    array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']
  )
  on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
  raise notice 'Images bucket ready.';
exception when others then
  raise notice 'SKIPPED the images bucket (%). Create a public bucket named "images" under Storage.', sqlerrm;
end
$$;

do $$
begin
  execute 'drop policy if exists "Users can upload images" on storage.objects';
  execute 'drop policy if exists "Users can update own images" on storage.objects';
  execute 'drop policy if exists "Users can delete own images" on storage.objects';
  execute 'drop policy if exists "Anyone can read images" on storage.objects';
  execute 'drop policy if exists "images_insert_own_folder" on storage.objects';
  execute 'drop policy if exists "images_update_own" on storage.objects';
  execute 'drop policy if exists "images_delete_own" on storage.objects';
  execute 'drop policy if exists "images_select_public" on storage.objects';

  -- Uploads must land in a folder named after the uploader's own id. The
  -- previous policy only checked that the caller was authenticated, so any
  -- signed-in user could write into any other user's folder.
  execute 'create policy "images_insert_own_folder" on storage.objects '
       || 'for insert with check (bucket_id = ''images'' '
       || 'and auth.uid()::text = (storage.foldername(name))[1])';

  execute 'create policy "images_update_own" on storage.objects '
       || 'for update using (bucket_id = ''images'' '
       || 'and auth.uid()::text = (storage.foldername(name))[1])';

  execute 'create policy "images_delete_own" on storage.objects '
       || 'for delete using (bucket_id = ''images'' '
       || 'and auth.uid()::text = (storage.foldername(name))[1])';

  execute 'create policy "images_select_public" on storage.objects '
       || 'for select using (bucket_id = ''images'')';

  raise notice 'Storage policies installed.';
exception when others then
  raise notice 'SKIPPED storage policies (%). Set them under Storage > Policies if image upload misbehaves.', sqlerrm;
end
$$;


-- =============================================================================
-- 9. Realtime
-- =============================================================================
-- Guarded: publications need elevated privileges. If skipped, the app still
-- works — edits just will not stream to a second tab until you reload.

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;

  foreach t in array array['pages', 'folders', 'sticky_notes', 'drawing_strokes', 'comments']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;

  -- Realtime sends only the primary key on UPDATE/DELETE unless replica
  -- identity is full. Without this, a note moved in one tab would not move in
  -- the other.
  execute 'alter table public.pages           replica identity full';
  execute 'alter table public.folders         replica identity full';
  execute 'alter table public.sticky_notes    replica identity full';
  execute 'alter table public.drawing_strokes replica identity full';
  execute 'alter table public.comments        replica identity full';

  raise notice 'Realtime configured.';
exception when others then
  raise notice 'SKIPPED realtime (%). The app works without it; edits just will not stream between tabs.', sqlerrm;
end
$$;


-- =============================================================================
-- 10. Report
-- =============================================================================
-- Confirms the columns the app actually needs. All should say true.

do $$
declare
  ok boolean := true;
  missing text := '';
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='folders' and column_name='sort_order')
  then ok := false; missing := missing || 'folders.sort_order '; end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='folders' and column_name='is_open')
  then ok := false; missing := missing || 'folders.is_open '; end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='sticky_notes' and column_name='z_index')
  then ok := false; missing := missing || 'sticky_notes.z_index '; end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='pages' and column_name='share_id')
  then ok := false; missing := missing || 'pages.share_id '; end if;

  if ok then
    raise notice 'SUCCESS: every column Lumen needs is present.';
  else
    raise notice 'STILL MISSING: %. Re-run this file and read the errors.', missing;
  end if;
end
$$;

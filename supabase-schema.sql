-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Folders
create table public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'New Folder',
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.folders enable row level security;
create policy "Users manage own folders" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pages
create table public.pages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  content text not null default '',
  icon text not null default 'file',
  folder_id uuid references public.folders(id) on delete set null,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pages enable row level security;
create policy "Users manage own pages" on public.pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sticky notes
create table public.sticky_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null default '',
  color text not null default 'yellow',
  x float not null default 0,
  y float not null default 0,
  width float not null default 200,
  height float not null default 150
);

alter table public.sticky_notes enable row level security;
create policy "Users manage own notes" on public.sticky_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Drawing strokes
create table public.drawing_strokes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tool text not null default 'pen',
  points jsonb not null default '[]',
  color text not null default '#000000',
  size float not null default 2,
  opacity float not null default 1
);

alter table public.drawing_strokes enable row level security;
create policy "Users manage own strokes" on public.drawing_strokes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Database schema for the notebook app.
-- Run this in the Supabase SQL editor. It is safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Untitled Notebook',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists cells (
  id           uuid primary key default gen_random_uuid(),
  notebook_id  uuid not null references notebooks (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null default 'code' check (type in ('code', 'markdown')),
  language     text not null default 'python',
  source       text not null default '',
  -- JSON blob: { status, stdout, stderr, result, durationMs, executionCount }.
  -- Plain strings written by older versions still load (see parseOutput).
  output       text not null default '',
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists cells_notebook_position_idx
  on cells (notebook_id, position);

create index if not exists notebooks_user_idx
  on notebooks (user_id);

-- Keep updated_at honest.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notebooks_touch_updated_at on notebooks;
create trigger notebooks_touch_updated_at
  before update on notebooks
  for each row execute function touch_updated_at();

drop trigger if exists cells_touch_updated_at on cells;
create trigger cells_touch_updated_at
  before update on cells
  for each row execute function touch_updated_at();

-- Row level security: the API talks to Postgres as the signed-in user, so these
-- policies are what actually keep one user's notebooks away from another's.
alter table notebooks enable row level security;
alter table cells enable row level security;

drop policy if exists "own notebooks" on notebooks;
create policy "own notebooks" on notebooks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own cells" on cells;
create policy "own cells" on cells
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

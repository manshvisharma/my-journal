create table if not exists public_shares (
  id text primary key,
  owner_uid text not null default 'local',
  entry_id text not null,
  owner_token text not null,
  payload jsonb not null,
  media jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  views_total integer not null default 0,
  visitors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists public_shares_entry_id_idx on public_shares (entry_id);
create index if not exists public_shares_active_idx on public_shares (active);

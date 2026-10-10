-- FORJA — Migración 002: bienestar autodeclarado
create table if not exists wellbeing_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  energy integer not null check (energy between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (profile_id, date)
);

alter table wellbeing_logs enable row level security;

create policy "owner_all_wellbeing" on wellbeing_logs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

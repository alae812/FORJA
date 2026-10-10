-- FORJA — Migración inicial (Supabase / PostgreSQL)
-- Diseño original. Aplica con: supabase db push  o  psql < 001_initial.sql
--
-- Modelo: cada tabla con datos de usuario lleva `profile_id` (uuid) que
-- referencia a profiles(id). En producción profiles.id = auth.uid().
-- RLS: cada usuario solo ve sus filas.

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============ perfiles ============
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  hero_name text not null check (char_length(hero_name) between 2 and 24),
  combat_style text check (combat_style in ('guardian','cazador','sabio')),
  daily_goal_xp integer not null default 30 check (daily_goal_xp between 5 and 500),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ personaje ============
create table if not exists character_stats (
  profile_id uuid primary key references profiles(id) on delete cascade,
  total_xp double precision not null default 0 check (total_xp >= 0),
  xp_str double precision not null default 0 check (xp_str >= 0),
  xp_sta double precision not null default 0 check (xp_sta >= 0),
  xp_wis double precision not null default 0 check (xp_wis >= 0),
  level integer not null default 0 check (level >= 0),
  updated_at timestamptz not null default now()
);

-- ============ sesiones ============
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  idempotency_key uuid not null,
  date date not null,
  status text not null default 'completed'
    check (status in ('planned','completed','cancelled')),
  exercises jsonb not null default '[]'::jsonb,
  xp_awarded double precision not null default 0,
  xp_breakdown jsonb not null default '[]'::jsonb,
  is_rest_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, idempotency_key)
);
create index if not exists idx_sessions_profile_date
  on training_sessions (profile_id, date desc);

-- ============ eventos XP (libro mayor auditable) ============
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  session_id uuid references training_sessions(id) on delete set null,
  kind text not null
    check (kind in ('set','set_bonus','cardio','mobility','session_complete','daily_goal','reversal')),
  attribute text check (attribute in ('str','sta','wis')),
  xp double precision not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_xp_events_profile_created
  on xp_events (profile_id, created_at desc);
create index if not exists idx_xp_events_session
  on xp_events (session_id);

-- ============ sueño / nutrición / progreso ============
create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  bed_time time not null,
  wake_time time not null,
  duration_min integer not null check (duration_min between 0 and 1440),
  quality integer not null check (quality between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (profile_id, date)
);

create table if not exists nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('desayuno','comida','merienda','cena','snack')),
  description text not null,
  water_ml integer check (water_ml between 0 and 5000),
  is_estimate boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_nutrition_profile_date
  on nutrition_logs (profile_id, date desc);

create table if not exists body_progress_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  weight_kg double precision check (weight_kg between 25 and 350),
  notes text,
  media_id uuid,
  created_at timestamptz not null default now()
);

-- ============ medios privados (nunca públicos) ============
create table if not exists private_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'body_analysis',
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  consent_at timestamptz not null,
  consent_purpose text not null,
  created_at timestamptz not null default now()
);

-- ============ historia ============
create table if not exists story_arcs (
  id text primary key,
  title text not null,
  description text not null,
  "order" integer not null
);

create table if not exists story_scenes (
  id text primary key,
  arc_id text not null references story_arcs(id) on delete cascade,
  title text not null,
  narration text not null,
  background_key text not null,
  character_key text,
  choices jsonb not null default '[]'::jsonb,
  trigger_event text not null,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists story_state (
  profile_id uuid primary key references profiles(id) on delete cascade,
  current_scene_id text,
  flags jsonb not null default '{}'::jsonb,
  unlocked_arcs jsonb not null default '["llamada"]'::jsonb,
  unlocked_cosmetics jsonb not null default '[]'::jsonb,
  seen_scene_ids jsonb not null default '[]'::jsonb,
  choice_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============ informes / hábitos / ajustes ============
create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  score double precision check (score between 0 and 100),
  rank text check (rank in ('S','A','B','C','D')),
  components jsonb not null default '{}'::jsonb,
  missing jsonb not null default '[]'::jsonb,
  xp_earned double precision not null default 0,
  sessions_completed integer not null default 0,
  is_rest_day boolean not null default false,
  recommendation text not null default '',
  created_at timestamptz not null default now(),
  unique (profile_id, date)
);

create table if not exists habit_checks (
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  habit_id text not null,
  done boolean not null default false,
  primary key (profile_id, date, habit_id)
);

create table if not exists user_settings (
  profile_id uuid primary key references profiles(id) on delete cascade,
  daily_goal_xp integer not null default 30 check (daily_goal_xp between 5 and 500),
  habits jsonb not null default '[]'::jsonb,
  planned_rest_days integer[] not null default '{0}',
  effects_enabled boolean not null default true,
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============ RPC atómica: sesión + eventos + stats ============
create or replace function apply_session_result(
  p_session jsonb,
  p_events jsonb,
  p_stats jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_profile uuid := (p_session->>'profile_id')::uuid;
begin
  -- La RLS se aplica igualmente: el llamante debe ser el dueño.
  insert into training_sessions (
    id, profile_id, idempotency_key, date, status,
    exercises, xp_awarded, xp_breakdown, is_rest_day, created_at, updated_at
  )
  values (
    (p_session->>'id')::uuid, v_profile, (p_session->>'idempotency_key')::uuid,
    (p_session->>'date')::date, p_session->>'status',
    coalesce(p_session->'exercises','[]'::jsonb),
    coalesce((p_session->>'xp_awarded')::double precision,0),
    coalesce(p_session->'xp_breakdown','[]'::jsonb),
    coalesce((p_session->>'is_rest_day')::boolean,false),
    now(), now()
  )
  on conflict (id) do update set
    status = excluded.status,
    exercises = excluded.exercises,
    xp_awarded = excluded.xp_awarded,
    xp_breakdown = excluded.xp_breakdown,
    updated_at = now();

  insert into xp_events (id, profile_id, session_id, kind, attribute, xp, meta, created_at)
  select
    (e->>'id')::uuid, v_profile,
    nullif(e->>'session_id','')::uuid,
    e->>'kind', e->>'attribute',
    (e->>'xp')::double precision,
    coalesce(e->'meta','{}'::jsonb), now()
  from jsonb_array_elements(p_events) as e;

  insert into character_stats (profile_id, total_xp, xp_str, xp_sta, xp_wis, level, updated_at)
  values (
    v_profile,
    (p_stats->>'total_xp')::double precision,
    (p_stats->>'xp_str')::double precision,
    (p_stats->>'xp_sta')::double precision,
    (p_stats->>'xp_wis')::double precision,
    (p_stats->>'level')::integer,
    now()
  )
  on conflict (profile_id) do update set
    total_xp = excluded.total_xp,
    xp_str = excluded.xp_str,
    xp_sta = excluded.xp_sta,
    xp_wis = excluded.xp_wis,
    level = excluded.level,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- ============ RLS ============
alter table profiles enable row level security;
alter table character_stats enable row level security;
alter table training_sessions enable row level security;
alter table xp_events enable row level security;
alter table sleep_logs enable row level security;
alter table nutrition_logs enable row level security;
alter table body_progress_entries enable row level security;
alter table private_media enable row level security;
alter table story_state enable row level security;
alter table daily_reports enable row level security;
alter table habit_checks enable row level security;
alter table user_settings enable row level security;
-- story_arcs y story_scenes son contenido global de lectura pública.

create policy "owner_all_profiles" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "owner_all_stats" on character_stats
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_sessions" on training_sessions
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_xp_events" on xp_events
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_sleep" on sleep_logs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_nutrition" on nutrition_logs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_body" on body_progress_entries
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_media" on private_media
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_story_state" on story_state
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_reports" on daily_reports
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_habits" on habit_checks
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "owner_all_settings" on user_settings
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Arcos iniciales
insert into story_arcs (id, title, description, "order") values
  ('llamada','La Llamada de la Forja','Naia, espíritu de la forja, te elige como aprendiz.',1),
  ('primer-golpe','El Primer Golpe','Tu primera sesión enciende el yunque.',2),
  ('ritmo','Ritmo de Guerra','La constancia convierte chispas en llamas.',3),
  ('sombra','La Sombra del Yunque','Kade, tu rival, cuestiona tu disciplina.',4),
  ('regreso','El Regreso','Volver tras un descanso también es victoria.',5)
on conflict (id) do nothing;

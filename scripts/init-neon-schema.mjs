import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';

for (const envFile of ['../.env.local', '../.env']) {
  try {
    process.loadEnvFile(fileURLToPath(new URL(envFile, import.meta.url)));
  } catch {
    // Local env files are optional; DATABASE_URL may already be set by the shell.
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const connectionUrl = new URL(databaseUrl);

// The CLI includes channel_binding=require, which can be brittle in some local
// environments. Keep SSL required and let the driver negotiate the rest.
connectionUrl.searchParams.delete('channel_binding');
connectionUrl.searchParams.set('sslmode', 'require');

const sql = neon(connectionUrl.toString());

const schemaSql = `
create extension if not exists pgcrypto;

create table if not exists schools (
  id text primary key,
  slug text not null unique,
  name text not null,
  city text,
  state text,
  control text,
  size text,
  size_bucket text,
  tuition text,
  tuition_bucket text,
  band text,
  image_url text,
  official_url text,
  usnews_url text,
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_stats (
  school_id text primary key references schools(id) on delete cascade,
  source text not null default 'college_scorecard',
  source_updated_at timestamptz,
  acceptance_rate numeric(5,4),
  graduation_rate numeric(5,4),
  median_earnings integer,
  avg_net_price integer,
  undergrad_enrollment integer,
  sat_reading_writing_mid integer,
  sat_math_mid integer,
  act_composite_mid integer,
  raw_payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_tags (
  school_id text not null references schools(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (school_id, tag)
);

create table if not exists school_vibe_cards (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references schools(id) on delete cascade,
  title text not null,
  body text not null,
  tone text,
  generated_by text,
  is_synthetic boolean not null default true,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  clerk_user_id text primary key,
  display_name text,
  graduation_year integer,
  home_state text,
  selected_school_ids_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists user_profiles
  add column if not exists selected_school_ids_json jsonb not null default '[]'::jsonb;

create table if not exists saved_schools (
  clerk_user_id text not null references user_profiles(clerk_user_id) on delete cascade,
  school_id text not null references schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clerk_user_id, school_id)
);

create table if not exists quiz_results (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text references user_profiles(clerk_user_id) on delete set null,
  answers_json jsonb not null,
  top_matches_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists match_profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique references user_profiles(clerk_user_id) on delete cascade,
  demo_key text,
  display_name text not null,
  graduation_year integer,
  major text not null default '',
  bio text not null default '',
  home_state text not null default '',
  avatar_type text not null default 'initials',
  avatar_url text,
  avatar_emoji text,
  cover_image_url text,
  is_demo boolean not null default false,
  demo_label text,
  profile_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists match_profiles
  add column if not exists demo_key text;

alter table if exists match_profiles
  add column if not exists avatar_emoji text;

alter table if exists match_profiles
  add column if not exists cover_image_url text;

create table if not exists match_profile_interests (
  profile_id uuid not null references match_profiles(id) on delete cascade,
  interest text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest)
);

create table if not exists match_profile_goals (
  profile_id uuid not null references match_profiles(id) on delete cascade,
  goal text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, goal)
);

create table if not exists match_profile_colleges (
  profile_id uuid not null references match_profiles(id) on delete cascade,
  school_id text not null references schools(id) on delete cascade,
  selection_rank integer not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, school_id)
);

create table if not exists compatibility_edges (
  viewer_profile_id uuid not null references match_profiles(id) on delete cascade,
  candidate_profile_id uuid not null references match_profiles(id) on delete cascade,
  score integer not null,
  shared_colleges_json jsonb not null default '[]'::jsonb,
  shared_signals_json jsonb not null default '[]'::jsonb,
  why_match_cached text,
  why_match_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (viewer_profile_id, candidate_profile_id)
);

create table if not exists friend_actions (
  viewer_profile_id uuid not null references match_profiles(id) on delete cascade,
  target_profile_id uuid not null references match_profiles(id) on delete cascade,
  action_type text not null,
  is_active boolean not null default true,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (viewer_profile_id, target_profile_id, action_type)
);

create index if not exists schools_active_idx on schools (active);
create index if not exists schools_slug_idx on schools (slug);
create index if not exists school_vibe_cards_school_id_idx on school_vibe_cards (school_id);
create index if not exists saved_schools_school_id_idx on saved_schools (school_id);
create index if not exists quiz_results_clerk_user_id_idx on quiz_results (clerk_user_id);
create index if not exists match_profiles_clerk_user_id_idx on match_profiles (clerk_user_id);
create unique index if not exists match_profiles_demo_key_uidx on match_profiles (demo_key) where demo_key is not null;
create index if not exists match_profile_interests_profile_id_idx on match_profile_interests (profile_id);
create index if not exists match_profile_goals_profile_id_idx on match_profile_goals (profile_id);
create index if not exists match_profile_colleges_profile_id_idx on match_profile_colleges (profile_id);
create index if not exists compatibility_edges_score_idx on compatibility_edges (viewer_profile_id, score desc);
create index if not exists friend_actions_viewer_action_idx on friend_actions (viewer_profile_id, action_type, is_active);
`;

try {
  const statements = schemaSql
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log('Neon schema initialized successfully.');
} catch (error) {
  console.error(error);
  process.exit(1);
}

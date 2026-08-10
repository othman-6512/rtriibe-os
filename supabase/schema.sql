-- ============================================================
-- rTriibe OS — full database schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ---------- Candidates (teachers) ----------
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  ref text,
  name text,
  spec text,
  curriculum text,
  qual text,
  uae_years numeric default 0,
  out_years numeric default 0,
  status text default 'New',
  email text,
  phone text,
  verbatim_experience text,
  verbatim_qualifications text,
  cv_url text,
  notes text
);

-- ---------- LSAs ----------
create table if not exists lsas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  cert text,
  exp text,
  langs text,
  background text,
  location text,
  status text default 'Available',
  family text,
  email text,
  phone text,
  placement_fee numeric default 1000,
  calc jsonb default '{}'::jsonb,
  notes jsonb default '[]'::jsonb,
  payments jsonb default '[]'::jsonb,
  cv_url text
);

-- ---------- Vacancies (teacher + LSA briefs) ----------
create table if not exists vacancies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  role text,
  school text,
  contact text,
  shortlist int default 0,
  days_open int default 0,
  kind text default 'teacher',
  status text default 'Open'
);

-- ---------- Pipeline ----------
create table if not exists pipeline (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  candidate_name text,
  candidate_ref text,
  vacancy text,
  stage text default 'Sourced'
);

-- ---------- Schools ----------
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  grp text,
  curriculum text,
  flags jsonb default '[]'::jsonb
);

-- ---------- Tasks ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  text text,
  done boolean default false,
  due text,
  tag text default 'General'
);

-- ---------- Bookings ----------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lsa_name text,
  family text,
  location text,
  rate numeric default 0,
  fee numeric default 0,
  status text default 'Active'
);

-- ---------- Attendance ----------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lsa_name text,
  date text,
  start_time text,
  end_time text,
  hours numeric default 0
);

-- ============================================================
-- Open policies: the app uses the public anon key from the browser
-- and is protected by the password gate. This lets it read/write.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['candidates','lsas','vacancies','pipeline','schools','tasks','bookings','attendance']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "allow all" on %I;', t);
    execute format('create policy "allow all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
-- Storage for original CV PDFs:
-- Do this in the dashboard, not here:
--   Storage → New bucket → name it  cvs  → tick "Public bucket" → Create.
-- ============================================================

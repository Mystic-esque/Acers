-- USERS handled by Supabase Auth (auth.users)

create table materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('uploaded_doc', 'bare_topic')),
  raw_content text, -- extracted text for uploaded docs; null for bare_topic
  storage_path text, -- path in Supabase Storage if a file was uploaded; null for bare_topic
  created_at timestamptz not null default now()
);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references materials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  location_marker text,
  created_at timestamptz not null default now()
);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid references materials(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ai_dependence_count int not null default 0
);

create table recall_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text not null,
  ai_feedback jsonb not null,
  created_at timestamptz not null default now()
);

create table assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('teach_back', 'hallucination', 'progressive_case')),
  status text not null default 'completed' check (status in ('in_progress', 'completed')),
  input jsonb not null,
  ai_grading jsonb,
  audio_storage_path text,
  created_at timestamptz not null default now()
);

create table concept_mastery (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dimension text not null check (dimension in ('understanding', 'independence', 'discrimination', 'analysis', 'transfer')),
  score numeric not null check (score >= 0 and score <= 100),
  last_updated timestamptz not null default now(),
  unique (concept_id, dimension)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  strong_concept_ids uuid[] not null default '{}',
  uncertain_concept_ids uuid[] not null default '{}',
  weak_concept_ids uuid[] not null default '{}',
  retrieval_score numeric,
  recommended_next_step text,
  created_at timestamptz not null default now()
);

-- Enable RLS on all tables
alter table materials enable row level security;
alter table concepts enable row level security;
alter table study_sessions enable row level security;
alter table recall_attempts enable row level security;
alter table assessment_attempts enable row level security;
alter table concept_mastery enable row level security;
alter table reports enable row level security;

-- Create policies assuming user_id matches auth.uid()
create policy "Users can access their own materials" on materials for all using (auth.uid() = user_id);
create policy "Users can access their own concepts" on concepts for all using (auth.uid() = user_id);
create policy "Users can access their own study sessions" on study_sessions for all using (auth.uid() = user_id);
create policy "Users can access their own recall attempts" on recall_attempts for all using (auth.uid() = user_id);
create policy "Users can access their own assessment attempts" on assessment_attempts for all using (auth.uid() = user_id);
create policy "Users can access their own concept mastery" on concept_mastery for all using (auth.uid() = user_id);
create policy "Users can access their own reports" on reports for all using (auth.uid() = user_id);

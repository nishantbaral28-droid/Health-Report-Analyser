-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Reports Table (stores metadata about the uploaded PDF/Image)
create type report_status as enum ('uploading', 'processing', 'completed', 'failed');

create table reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_url text not null, -- The Supabase Storage URL
  status report_status default 'uploading' not null,
  summary text, -- A brief AI-generated summary string of the entire report
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Insights Table (stores structured AI extraction data linked to a report)
-- Using a JSONB column allows flexible storage of complex structured bloodwork/vitals data returned by the LLM
create table insights (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade not null unique,
  user_id uuid references public.profiles(id) on delete cascade not null,
  structured_data jsonb not null, -- Expected structure: { "biomarkers": [{ "name": "Cholesterol", "value": "180", "unit": "mg/dL", "status": "normal" }], "recommendations": [] }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table profiles enable row level security;
alter table reports enable row level security;
alter table insights enable row level security;

-- Create basic RLS policies allowing users to only see/edit their own data
create policy "Users can view own profile." on profiles for select using (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

create policy "Users can view own reports." on reports for select using (auth.uid() = user_id);
create policy "Users can insert own reports." on reports for insert with check (auth.uid() = user_id);
create policy "Users can update own reports." on reports for update using (auth.uid() = user_id);
create policy "Users can delete own reports." on reports for delete using (auth.uid() = user_id);

create policy "Users can view own insights." on insights for select using (auth.uid() = user_id);
create policy "Users can insert own insights." on insights for insert with check (auth.uid() = user_id);
create policy "Users can update own insights." on insights for update using (auth.uid() = user_id);
create policy "Users can delete own insights." on insights for delete using (auth.uid() = user_id);

-- 4. Create Extraction Logs Table (stores precise biomarker extractions for validation and anti-hallucination)
create table extraction_logs (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  biomarker text not null,
  value text,
  unit text,
  confidence numeric,
  source text,
  category text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table extraction_logs enable row level security;
create policy "Users can view own extraction logs." on extraction_logs for select using (auth.uid() = user_id);
create policy "Users can insert own extraction logs." on extraction_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own extraction logs." on extraction_logs for update using (auth.uid() = user_id);
create policy "Users can delete own extraction logs." on extraction_logs for delete using (auth.uid() = user_id);

-- Profile trigger on auth.user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Create Assessment Sessions Table (stores health questionnaire responses)
create table assessment_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  computed_scores jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table assessment_sessions enable row level security;

-- Allow anonymous inserts (lead gen format) but restrict selects to owners if linked
create policy "Anyone can insert assessment sessions." on assessment_sessions for insert with check (true);
create policy "Users can view own assessment sessions." on assessment_sessions for select using (auth.uid() = user_id or user_id is null);
create policy "Users can update own assessment sessions." on assessment_sessions for update using (auth.uid() = user_id);

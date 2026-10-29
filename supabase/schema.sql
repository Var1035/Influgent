-- ==============================================================================
-- TrendPilot / Influgent Supabase PostgreSQL Schema
-- Section 10 of Project Abstract
-- ==============================================================================

-- 1. Categories Table
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  youtube_category_id text,
  keywords text[] default '{}',
  subreddits text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Topics (Clustered Trend Momentum)
create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  summary text,
  momentum_score integer default 0,
  growth_rate text,
  platforms text[] default '{}',
  audience_questions text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Suggestions (Creator Content Blueprints)
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  topic_title text not null,
  category text not null,
  format text not null default 'shorts',
  why_trending text,
  hooks jsonb default '{}'::jsonb,
  script_outline jsonb default '{}'::jsonb,
  linkedin_post text,
  caption text,
  hashtags text[] default '{}',
  recommended_length text,
  best_posting_window text,
  status text not null default 'draft',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) & Public Access Policies for Demo
alter table categories enable row level security;
alter table topics enable row level security;
alter table suggestions enable row level security;

create policy "Allow public read access on categories" on categories for select using (true);
create policy "Allow public read access on topics" on topics for select using (true);
create policy "Allow public all access on suggestions" on suggestions for all using (true);

-- ==============================================================================
-- Initial Seed Data
-- ==============================================================================

insert into categories (name, slug, subreddits) values
  ('Tech & AI', 'tech-ai', array['LocalLLaMA', 'artificial', 'MachineLearning']),
  ('Creator Economy', 'creator-economy', array['NewTubers', 'PartneredYoutube', 'socialmedia']),
  ('Productivity & Work', 'productivity', array['SideProject', 'entrepreneur', 'Productivity']),
  ('Fitness & Health', 'fitness', array['fitness', 'biohackers', 'running'])
on conflict (slug) do nothing;

insert into topics (category, title, summary, momentum_score, growth_rate, platforms, audience_questions) values
  (
    'Tech & AI',
    'Autonomous Coding Agents & Local LLMs',
    'Developers and creators are pivoting from simple autocomplete copilot tools to autonomous agent swarms running locally on Mac and RTX GPUs.',
    94,
    '+420% view velocity in 24h',
    array['youtube', 'reddit', 'cross-platform'],
    array['Can local models actually build full-stack apps without breaking code?', 'How much VRAM do I need before it becomes slow?']
  ),
  (
    'Creator Economy',
    'The Shift to Voice-First & Raw Aesthetic Content',
    'Over-edited talking head videos are seeing retention drops; raw, single-take voiceover formats with high-signal hooks are outperforming 3x.',
    89,
    '+310% engagement delta',
    array['youtube', 'reddit', 'cross-platform'],
    array['Why are overproduced videos getting fewer views now?', 'How do you write a 3-second hook that does not feel like clickbait?']
  ),
  (
    'Productivity & Work',
    'One-Person AI Agencies ($0 Overhead Stack)',
    'Solopreneurs utilizing agentic automation tools to replace legacy 5-person agency retainers.',
    86,
    '+270% search surge',
    array['youtube', 'reddit', 'cross-platform'],
    array['Which services are businesses actually paying solo creators for?']
  );


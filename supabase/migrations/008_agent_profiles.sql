-- Migration: agent_profiles
-- Stores professional data for agent users + gates onboarding completion.

create table public.agent_profiles (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references public.profiles(id) on delete cascade,

  -- Step 1 (required)
  phone                text,
  headshot_url         text,

  -- Step 2 (required)
  license_number       text,
  brokerage_name       text,
  years_experience     integer,

  -- Step 3 (optional)
  market_focus         text[] not null default '{}',

  -- Step 4 (optional)
  bio                  text,

  -- Onboarding gate: flips to true after step 2 is saved
  onboarding_completed boolean not null default false,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  unique(user_id)
);

create trigger agent_profiles_updated_at
  before update on public.agent_profiles
  for each row execute procedure public.set_updated_at();

alter table public.agent_profiles enable row level security;

-- Agents manage their own profile
create policy "agent_manage_own_profile"
  on public.agent_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Buyers/renters can read agent profiles (for connection flows, previews)
create policy "buyers_can_read_agent_profiles"
  on public.agent_profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('buyer', 'renter')
    )
  );

-- NOTE: Create a Supabase Storage bucket named "agent-headshots":
--   - Public reads (SELECT policy: true)
--   - Insert scoped to owner: auth.uid()::text = (storage.foldername(name))[1]
--   - Delete scoped to owner: auth.uid()::text = (storage.foldername(name))[1]
--   Path convention: agent-headshots/{user_id}/{timestamp}-{filename}

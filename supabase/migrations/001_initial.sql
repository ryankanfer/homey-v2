-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- Extends auth.users with role and display info
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('buyer', 'renter', 'agent')) default 'buyer',
  full_name  text,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on user sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'buyer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── BUYER PROFILES ─────────────────────────────────────────────────────────
create table public.buyer_profiles (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  mode             text,
  timeline         text,
  timeline_context text,
  budget_tier      text,
  budget_context   text,
  territory        text[] not null default '{}',
  fear             text,
  fear_context     text,
  summary          text,
  readiness_score  integer not null default 0,
  vault            jsonb not null default '{"w2":false,"bank":false,"rebny":false,"preapproval":false,"attorney":false}',
  journey_stage    integer not null default 1,
  accuracy_rating  text,
  is_partial       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(user_id)
);

-- ─── AGENT-CLIENT RELATIONSHIPS ─────────────────────────────────────────────
create table public.agent_clients (
  id         uuid primary key default uuid_generate_v4(),
  agent_id   uuid not null references public.profiles(id) on delete cascade,
  client_id  uuid not null references public.profiles(id) on delete cascade,
  status     text not null check (status in ('pending', 'active', 'closed')) default 'pending',
  created_at timestamptz not null default now(),
  unique(agent_id, client_id)
);

-- ─── LISTING ANALYSES ───────────────────────────────────────────────────────
-- Agent pastes a URL for a client → AI analysis stored here → client sees it
create table public.listing_analyses (
  id         uuid primary key default uuid_generate_v4(),
  agent_id   uuid not null references public.profiles(id) on delete cascade,
  client_id  uuid not null references public.profiles(id) on delete cascade,
  url        text not null,
  analysis   text,
  created_at timestamptz not null default now()
);

-- ─── CHAT MESSAGES ──────────────────────────────────────────────────────────
create table public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_user_id_created_at on public.chat_messages(user_id, created_at);

-- ─── UPDATED_AT TRIGGERS ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger buyer_profiles_updated_at before update on public.buyer_profiles
  for each row execute procedure public.set_updated_at();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.agent_clients enable row level security;
alter table public.listing_analyses enable row level security;
alter table public.chat_messages enable row level security;

-- profiles: users see their own row; agents can see their clients' profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Agents can view client profiles"
  on public.profiles for select using (
    exists (
      select 1 from public.agent_clients
      where agent_id = auth.uid() and client_id = id
    )
  );

-- buyer_profiles: owner + assigned agent
create policy "Buyer can manage own profile"
  on public.buyer_profiles for all using (auth.uid() = user_id);

create policy "Agent can view assigned client buyer profile"
  on public.buyer_profiles for select using (
    exists (
      select 1 from public.agent_clients
      where agent_id = auth.uid() and client_id = user_id
    )
  );

-- agent_clients: agents see their own relationships
create policy "Agents manage their client relationships"
  on public.agent_clients for all using (auth.uid() = agent_id);

create policy "Clients can see their agent relationships"
  on public.agent_clients for select using (auth.uid() = client_id);

-- listing_analyses: agent writes, client reads
create policy "Agent can manage listing analyses"
  on public.listing_analyses for all using (auth.uid() = agent_id);

create policy "Client can view their listing analyses"
  on public.listing_analyses for select using (auth.uid() = client_id);

-- chat_messages: users own their messages
create policy "Users manage own chat messages"
  on public.chat_messages for all using (auth.uid() = user_id);

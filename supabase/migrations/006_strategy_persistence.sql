-- ─── STRATEGY CHATS ────────────────────────────────────────────────────────
-- Stores the conversational history between the user and the AI Strategist.
-- This allows the agent (ADVSR) to mirror the user's journey.

create table if not exists public.strategy_chats (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  metadata        jsonb not null default '{}', -- For storing listing URLs, extracted signals, etc.
  created_at      timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
alter table public.strategy_chats enable row level security;

-- 1. Users can manage their own chats
create policy "Users can manage own strategy chats"
  on public.strategy_chats for all using (auth.uid() = user_id);

-- 2. Agents can view authorized client strategy chats
-- (Visible once the Readiness Score >= 75 and an agent connection is active)
create policy "Agents can view client strategy chats"
  on public.strategy_chats for select using (
    exists (
      select 1 from public.agent_clients
      where agent_id = auth.uid() and client_id = user_id
    )
  );

-- ─── INDEXES ────────────────────────────────────────────────────────────────
create index if not exists strategy_chats_user_id_idx on public.strategy_chats(user_id);
create index if not exists strategy_chats_created_at_idx on public.strategy_chats(created_at);

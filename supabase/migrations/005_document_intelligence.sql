-- ─── ENUMS ──────────────────────────────────────────────────────────────────
do $$ begin
  create type public.document_status as enum ('pending', 'processing', 'processed', 'error');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_category as enum ('w2', 'bank_statement', 'pre_approval', 'tax_return', 'other');
exception
  when duplicate_object then null;
end $$;

-- ─── USER DOCUMENTS ──────────────────────────────────────────────────────────
-- Tracks the raw file upload metadata
create table if not exists public.user_documents (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  file_type    text not null,
  status       public.document_status not null default 'pending',
  agent_access_granted boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── DOCUMENT INTELLIGENCE ──────────────────────────────────────────────────
-- Stores the AI-extracted structured data and intuition
create table if not exists public.document_intelligence (
  id              uuid primary key default uuid_generate_v4(),
  document_id     uuid not null references public.user_documents(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  category        public.document_category not null,
  extracted_data  jsonb not null default '{}',
  signal_summary  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(document_id)
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
alter table public.user_documents enable row level security;
alter table public.document_intelligence enable row level security;

-- user_documents: owner + authorized agent
create policy "Users can manage own documents"
  on public.user_documents for all using (auth.uid() = user_id);

create policy "Agents can view authorized client documents"
  on public.user_documents for select using (
    agent_access_granted = true AND
    exists (
      select 1 from public.agent_clients
      where agent_id = auth.uid() and client_id = user_id
    )
  );

-- document_intelligence: owner + authorized agent
create policy "Users can view own document intelligence"
  on public.document_intelligence for select using (auth.uid() = user_id);

create policy "Agents can view authorized document intelligence"
  on public.document_intelligence for select using (
    exists (
      select 1 from public.user_documents
      where id = document_id and agent_access_granted = true
    ) AND
    exists (
      select 1 from public.agent_clients
      where agent_id = auth.uid() and client_id = user_id
    )
  );

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────────────────────
create trigger user_documents_updated_at before update on public.user_documents
  for each row execute procedure public.set_updated_at();

create trigger document_intelligence_updated_at before update on public.document_intelligence
  for each row execute procedure public.set_updated_at();

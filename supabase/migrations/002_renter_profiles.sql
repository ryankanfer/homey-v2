-- ─── RENTER PROFILES ─────────────────────────────────────────────────────────
create table public.renter_profiles (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  mode             text check (mode = 'Rent'),
  timeline         text,
  timeline_context text,
  move_in_date     date,
  budget_monthly   text,
  max_monthly_rent integer,
  meets_income_req boolean,
  using_guarantor  boolean,
  budget_context   text,
  territory        text[] not null default '{}',
  fear             text,
  fear_context     text,
  summary          text,
  readiness_score  integer not null default 0,
  vault            jsonb not null default '{"w2":false,"bank":false,"guarantor":false,"landlord":false,"id":false}',
  journey_stage    integer not null default 1,
  accuracy_rating  text,
  is_partial       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(user_id)
);

create trigger renter_profiles_updated_at before update on public.renter_profiles
  for each row execute procedure public.set_updated_at();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
alter table public.renter_profiles enable row level security;

-- renter_profiles: owner + assigned agent
create policy "Renter can manage own profile"
  on public.renter_profiles for all using (auth.uid() = user_id);

create policy "Agent can view assigned client renter profile"
  on public.renter_profiles for select using (
    exists (
      select 1 from public.agent_clients
      where agent_id = auth.uid() and client_id = user_id
    )
  );

-- IdeiaMap core + RLS (anon + JWT, sem service role no cliente)

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  preferences jsonb not null default '{"locale":"pt-BR","digest":true}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  insert into public.subscriptions (id, user_id, plan_id, status)
  values ('sub_' || substr(replace(new.id::text, '-', ''), 1, 12), new.id, 'plan_start', 'active');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.plans (
  id text primary key,
  name text not null,
  project_limit int not null,
  credits_limit int not null,
  price numeric not null default 0
);

insert into public.plans (id, name, project_limit, credits_limit, price) values
  ('plan_start', 'Trilha', 3, 200, 0),
  ('plan_atelier', 'Ateliê', 20, 2000, 79)
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status text not null check (status in ('active', 'canceled', 'past_due'))
);

create table if not exists public.projects (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  is_archived boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.requirements (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null check (priority in ('alta', 'média', 'baixa'))
);

create table if not exists public.screens (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  name text not null,
  route text not null default '/',
  description text not null default '',
  wireframe_html text not null default '',
  components jsonb not null default '[]'::jsonb
);

create table if not exists public.chat_messages (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  context text not null check (context in ('overview', 'database')),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_versions (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  number int not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.exports (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  targets jsonb not null,
  status text not null,
  file_url text,
  version_number int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  operation text not null,
  credits int not null,
  cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.url_fetches (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  url text not null,
  text text not null default '',
  error text,
  fetched_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade unique,
  findings jsonb not null default '[]'::jsonb
);

create table if not exists public.competitors (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  name text not null,
  url text not null default '',
  notes text not null default ''
);

create table if not exists public.personas (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  name text not null,
  job text not null default '',
  stories jsonb not null default '[]'::jsonb,
  acceptance jsonb not null default '[]'::jsonb
);

create table if not exists public.data_models (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade unique,
  tables jsonb not null default '[]'::jsonb,
  notes text not null default ''
);

create table if not exists public.ai_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  models jsonb not null default '{"prompt":"openai/gpt-4o-mini","prd":"openai/gpt-4o-mini","chat":"openai/gpt-4o-mini"}'::jsonb
);

create table if not exists public.prompt_templates (
  id text primary key,
  name text not null,
  content text not null,
  version int not null default 1,
  is_published boolean not null default false
);

create table if not exists public.jobs (
  id text primary key,
  project_id text references public.projects (id) on delete set null,
  type text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  error text
);

create table if not exists public.audit_logs (
  id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cost_entries (
  id text primary key,
  type text not null check (type in ('ia', 'scraping', 'infra')),
  description text not null,
  amount numeric not null,
  period text not null
);

-- RLS
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.requirements enable row level security;
alter table public.screens enable row level security;
alter table public.chat_messages enable row level security;
alter table public.project_versions enable row level security;
alter table public.exports enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.url_fetches enable row level security;
alter table public.analyses enable row level security;
alter table public.competitors enable row level security;
alter table public.personas enable row level security;
alter table public.data_models enable row level security;
alter table public.ai_settings enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.cost_entries enable row level security;

alter table public.profiles force row level security;
alter table public.projects force row level security;
alter table public.requirements force row level security;
alter table public.screens force row level security;
alter table public.chat_messages force row level security;
alter table public.project_versions force row level security;
alter table public.exports force row level security;
alter table public.url_fetches force row level security;
alter table public.analyses force row level security;
alter table public.competitors force row level security;
alter table public.personas force row level security;
alter table public.data_models force row level security;

create policy profiles_select_own on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update using (public.is_admin());

create policy plans_read on public.plans for select to authenticated using (true);

create policy subscriptions_own on public.subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy projects_own on public.projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.owns_project(pid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id = pid and p.user_id = auth.uid());
$$;

create policy req_tenant on public.requirements for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy scr_tenant on public.screens for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy chat_tenant on public.chat_messages for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy ver_tenant on public.project_versions for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy exp_tenant on public.exports for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy fetch_tenant on public.url_fetches for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy an_tenant on public.analyses for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy cmp_tenant on public.competitors for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy per_tenant on public.personas for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy dm_tenant on public.data_models for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));

create policy credits_own on public.credit_transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ai_settings_own on public.ai_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy templates_admin on public.prompt_templates for select to authenticated using (true);
create policy templates_admin_write on public.prompt_templates for all using (public.is_admin()) with check (public.is_admin());

create policy jobs_admin on public.jobs for select to authenticated using (public.is_admin() or project_id is null);
create policy audit_admin on public.audit_logs for select using (public.is_admin());
create policy cost_admin on public.cost_entries for select using (public.is_admin());

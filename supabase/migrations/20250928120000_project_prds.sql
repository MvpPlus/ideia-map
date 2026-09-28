-- spec 014: entrevista de triagem e PRD por projeto (AC-10)

create table if not exists public.project_prds (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade unique,
  stage text not null default 'interview' check (stage in ('interview', 'review', 'approved')),
  questions jsonb not null default '[]'::jsonb,
  prd_markdown text not null default '',
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.project_prds enable row level security;
alter table public.project_prds force row level security;

drop policy if exists prd_tenant on public.project_prds;
create policy prd_tenant on public.project_prds
  for all to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

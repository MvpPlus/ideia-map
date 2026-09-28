-- spec 015: documentos técnicos em cadeia (TRD, fluxo, UI/UX, backend, plano) por projeto (AC-7)

create table if not exists public.project_artifacts (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('trd', 'flow', 'design', 'backend', 'plan')),
  markdown text not null default '',
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (project_id, kind)
);

alter table public.project_artifacts enable row level security;
alter table public.project_artifacts force row level security;

drop policy if exists artifacts_tenant on public.project_artifacts;
create policy artifacts_tenant on public.project_artifacts
  for all to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

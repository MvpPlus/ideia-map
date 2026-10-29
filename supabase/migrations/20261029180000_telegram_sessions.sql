-- Sessões FSM do bot Telegram (só servidor com secret key; sem policy = negado a anon/authenticated)

create table if not exists public.telegram_sessions (
  telegram_user_id bigint primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.telegram_sessions enable row level security;
alter table public.telegram_sessions force row level security;

-- Sem policies para authenticated/anon: o bot grava via SUPABASE_SECRET_KEY (bypass RLS).
comment on table public.telegram_sessions is 'FSM do bot Telegram; acesso apenas com secret key no servidor.';

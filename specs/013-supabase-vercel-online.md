# Spec: Supabase + Vercel (teste online)

Status: aceito  
Fase: auth real + Postgres + deploy preview  
Fora: Stripe, Playwright, crawler autenticado, service role no browser

## Contexto

Colocar o IdeiaMap na Vercel com dados e login no Supabase para testar online. O contrato continua o `DataRepository`. Local: `DATA_SOURCE=mock`. Produção/preview: `DATA_SOURCE=supabase` + chaves públicas Supabase + secrets de IA no servidor.

## Critérios

### AC-1 Sem secret no cliente
Dado o bundle do browser, quando inspeciona env público, então existem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fallback legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — nunca `NEXT_PUBLIC_*` com secret ou service role. `SUPABASE_SECRET_KEY` só no servidor.

### AC-2 RLS de tenant
Dado dois usuários autenticados, quando um lista projetos, então só vê linhas com `user_id = auth.uid()`; filhas exigem projeto do dono.

### AC-3 Bootstrap
Dado `DATA_SOURCE=supabase` e sessão válida, quando a app hidrata, então carrega perfil, projetos e filhas via publishable key + JWT (RLS).

### AC-4 Deploy
Dado migration aplicada e env na Vercel, quando abre a URL de preview, então login/cadastro e criar projeto persistem no Postgres.

## Três etapas (operacional)

1. **Supabase** — projeto, rodar migration, copiar URL + publishable key (+ secret key só na Vercel servidor), opcional: marcar admin em `profiles.role`.  
2. **Vercel** — link do repo, env (Supabase + IA + `DATA_SOURCE=supabase`), deploy.  
3. **Validar** — cadastro, novo projeto, segundo browser/usuário não vê dados alheios.

Detalhe passo a passo: `docs/deploy-vercel-supabase.md`.

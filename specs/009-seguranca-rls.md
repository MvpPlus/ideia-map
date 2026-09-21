# Spec: segurança RLS e segredos (Vercel + Supabase)

Status: aceito  
Fase: contrato mock agora; adapter Supabase depois  
Fora: Auth Supabase nesta fatia, migrations aplicadas, Stripe

## Contexto

Todo dado de tenant é do dono do projeto. Segredos não vão ao cliente. Fetch de URL só no servidor.

## Critérios

### AC-1 Isolamento de pesquisa
Dado um projeto de outro usuário, quando a sessão atual pede análises/competidores/personas/modelo, então o mock recusa (sem devolver o conteúdo).

### AC-2 Segredo da IA
Dado o admin, quando persiste a chave OpenRouter, então ela não é gravada no snapshot do `localStorage` do app (continua em `.env.local` / secret Vercel).

## Contrato Supabase (mesmo que o mock)

- RLS + `force` em tabelas de tenant; `auth.uid() = user_id`; filhas via `exists` no projeto.
- Admin só com policy de `role = admin`, sem service role no browser.
- `OPENROUTER_API_KEY` em env Vercel ou Vault; Vault/`pgsodium` se a chave for por workspace.
- Fetch só em Route Handler; negar hosts privados (SSRF). HTML scrape vira texto, nunca `srcDoc` cru.

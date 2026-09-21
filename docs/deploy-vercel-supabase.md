# Deploy IdeiaMap — Vercel + Supabase (teste online)

Sem pagamento. Fora deste guia: Playwright, crawler autenticado, service role no browser.

## Etapa 1 — Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região perto do público).
2. **SQL Editor** → execute, nesta ordem:
   - `supabase/migrations/20250921120000_core_rls.sql`
   - `supabase/migrations/20250921193000_profiles_rls_sync.sql`
3. **Authentication → Providers** → Email ligado (confirmação de e-mail pode ficar desligada em dev/preview se quiser entrar rápido).
4. **Project Settings → API Keys** → copie:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret** (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (só Vercel/servidor; reserva para jobs admin — o app usa RLS + publishable no browser)
5. (Opcional) Tornar alguém admin depois do primeiro cadastro:
   ```sql
   update public.profiles set role = 'admin' where email = 'seu@email.com';
   ```

Não coloque **secret** / service role em variável `NEXT_PUBLIC_*`.

## Etapa 2 — Vercel

1. Importe o repositório na [Vercel](https://vercel.com) ou `vercel link` na pasta do projeto.
2. **Settings → Environment Variables** (Production e Preview):

| Variável | Onde |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase API (publishable) |
| `SUPABASE_SECRET_KEY` | Supabase API (secret, só servidor) |
| `DATA_SOURCE` | `supabase` |
| `NEXT_PUBLIC_DATA_SOURCE` | `supabase` |
| `OPENROUTER_API_KEY` | secret servidor |
| `GOOGLE_AI_STUDIO_API_KEY` | secret servidor |
| `NEXT_PUBLIC_SITE_URL` | URL do deploy (ex. `https://ideiamap.vercel.app`) — reset de senha |

3. Deploy (push na branch ou **Deploy** no dashboard).
4. Local com os mesmos dados: `vercel env pull` → `.env.local` (não commitar).

Integração Vercel ↔ Supabase no marketplace acelera URL/keys; confira se `DATA_SOURCE=supabase` foi definido manualmente.

## Etapa 3 — Validar online

1. Abra a URL de preview/produção → **Criar conta** (não depende mais do seed local).
2. **Novo projeto** → plano da IA → overview com requisitos/telas.
3. Outro usuário/cadastro → não deve ver projetos do primeiro (RLS).
4. **Admin** só se `profiles.role = 'admin'`; chaves de IA continuam só no servidor (aba OpenRouter no admin grava `.env.local` localmente; na Vercel use env vars).

Problemas comuns:

- **“Adapter Supabase ainda não está ligado”** → `DATA_SOURCE` não é `supabase` no deploy.
- **Login não persiste** → confira URL/publishable key e domínio do site em Auth → URL Configuration na Supabase.
- **IA falha** → secrets OpenRouter/Google na Vercel, redeploy.

Local continua com `DATA_SOURCE=mock` e porta **3001** (`npm run dev`).

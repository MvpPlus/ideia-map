# Lições aprendidas — IdeiaMap

Caderno do agente. Specs em `specs/` são a fonte de comportamento. Aqui entra produto, recorte, contratos, UX já corrigida e erros que não devem se repetir.

**Entra:** decisões de negócio, o que está adiado, persistência, IA, fluxos, armadilhas.

**Não entra:** logs, chaves, stack traces, detalhes privados de implementação.

Formato de entrada: **data · contexto · o que deu errado ou mudou · daqui pra frente**.

---

## Produto e recorte

- **2026-09-19 · recorte** · Análise, competitivo, personas e banco saíram do “em breve”. · Crawler = fetch Cheerio no servidor (8s, texto sanitizado), não Googlebot. Modelo **Prompt** sintetiza esses quatro; PRD e Chat inalterados. RLS/secrets em `specs/009` e regra `seguranca.mdc`.

- **2026-09-17 · rotas públicas** · Landing e login estavam misturados. · `/` é a landing; login em `/login`. Dev local na porta **3001**.

## Regras de negócio e persistência

- **2026-09-17 · dados** · Backend real ainda não. · `DataRepository` + `MockAdapter` (`localStorage`). Supabase depois, **mesmo contrato** do repository. Tipos/tabelas futuras em `src/lib/types.ts`.

- **2026-09-21 · deploy online** · Só mock local. · `SupabaseAdapter` + migration RLS + auth Supabase; guia em `docs/deploy-vercel-supabase.md`. Local continua `DATA_SOURCE=mock`. Sem Stripe, Playwright, crawler autenticado, service role no browser.

- **2026-09-21 · chaves Supabase** · Dashboard migrou de anon/service role para publishable/secret. · Env: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` na Vercel; fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY` só transição. Secret reservada ao servidor; app no browser continua RLS + JWT.

- **2026-09-21 · projeto sumindo online** · IA gerava e a tela ficava em branco. · `flushSnapshotToSupabase` era fire-and-forget + `window.location` recarregava antes do Postgres; corrigir com `persistNow()` antes de navegar e erros visíveis do Supabase.

- **2026-09-21 · RLS profiles** · Flush fazia upsert com `role` sem policy de insert. · Migration `20250921193000_profiles_rls_sync.sql` + sync só update/insert bootstrap sem role no patch comum.

- **2026-09-17 · criar projeto** · Sem plano da IA, o mock ainda gera requisito + duas telas + versão 1 + débito de créditos. Com plano OpenRouter, requisitos e telas vêm do JSON validado.

## IA / OpenRouter

- **2026-09-17 · chave** · IA mockada não serve. · Chave colada no admin, gravada em `.env.local` (gitignore); em produção, `OPENROUTER_API_KEY` é secret. Sem chave no cliente. Leitura por request (`loadOpenRouterKey()`), sem depender de restart.

- **2026-09-19 · consumo IA** · Não havia visão de tokens no admin. · Aba **Consumo**: chamadas, tokens e USD estimado a partir das respostas da OpenRouter/Gemini. Arquivo local gitignore; não é fatura real.

- **2026-09-19 · catálogo de modelos** · O dropdown só listava OpenRouter `:free`. · Buscar modelos junta OpenRouter (gratuitos) e Google AI Studio; o rótulo começa com `Openrouter:` ou `Google Ai Studio:`.

- **2026-09-19 · frases de espera** · As 5 linhas se repetiam. · Overlay embaralha ~30 frases no tom unicórnio/briefing a cada geração.

## UI e fluxos

- **2026-09-17 · telas** · Preview era stub “Wireframe inicial”, sem os componentes. · HTML deriva de nome, rota, descrição e componentes (`buildWireframeHtml`). Prévia com `iframe srcDoc`, não `data:` URL. Spec `007-screen-wireframe`.

- **2026-09-19 · editar detalhes** · Opções → Editar só mudava o texto, sem aviso. · Dashboard e overview têm **Editar detalhes**. Confirmar refaz o plano e limpa busca/análise/radar/personas/banco. Cancelar não grava.

## Armadilhas técnicas

- **2026-09-17 · lottie-react v3** · `import Lottie from "lottie-react"` + `animationData` quebrou o build (“Export default doesn't exist”). · Import nomeado `{ Lottie }` e prop `src`.

- **2026-09-17 · PowerShell** · `&&` não encadeia comandos nesta shell. · Comandos separados ou `;`.

- **2026-09-17 · sessão** · Código lia `session.role` / `session.name`. · Sessão mock é `{ user }`; nome e papel estão em `session.user`.

- **2026-09-17 · overview** · Loop infinito no bundle do projeto. · `useMemo` em `useProjectBundle`.

- **2026-09-17 · navegação pós-plano** · `router.push` após gerar o projeto às vezes não ia. · `window.location.assign` para o overview.

- **2026-09-17 · porta 3001** · Dev preso / CPU alta. · Matar o Node preso e `npm run dev` de novo (`next dev -p 3001`).

# IdeiaMap — constituição do agente

Produto: transformar briefings em planejamento de software editável, depois exportável para IDEs.

## Método (obrigatório)

1. **SDD** — spec em `specs/` é a fonte de verdade. Sem critério de aceite, não há feature.
2. **TDD** — teste vermelho → código mínimo → refactor. Ver `.cursor/rules/`.
3. **Skill** — ao implementar comportamento, seguir `.cursor/skills/sdd-tdd/SKILL.md`.

## Stack desta fase

- Next.js App Router, TypeScript, Tailwind
- Dados: `DataRepository` + `MockAdapter` (`localStorage`) ou `SupabaseAdapter` (`DATA_SOURCE=supabase`)
- Deploy teste: `docs/deploy-vercel-supabase.md` · migration em `supabase/migrations/`
- OpenRouter e Google AI Studio: chaves no admin → `.env.local` (`OPENROUTER_API_KEY`, `GOOGLE_AI_STUDIO_API_KEY`). Load balance round-robin; até 5 modelos em cada. Sem chave no cliente. Consumo (tokens e USD estimado) na aba admin **Consumo**.
- Segurança: RLS e isolamento por dono — ver `.cursor/rules/seguranca.mdc` e `specs/009-seguranca-rls.md`.

## Onde olhar

| Precisa | Caminho |
| --- | --- |
| Comportamento atual | `specs/` |
| Segurança (RLS, secrets, SSRF) | `.cursor/rules/seguranca.mdc` · `specs/009-seguranca-rls.md` |
| Lições (produto, erros, recortes) | `docs/licoes-aprendidas.md` |
| Tipos / tabelas futuras | `src/lib/types.ts` |
| Persistência mock | `src/lib/data/` |
| UI | `src/app/`, `src/components/` |

## Recorte

Núcleo: auth, dashboard, novo projeto, overview, telas, export, perfil, admin, análise, competitivo, personas, banco (Cheerio + modelo Prompt).  
Adiado: Auth Supabase, Playwright, crawler autenticado, Stripe.

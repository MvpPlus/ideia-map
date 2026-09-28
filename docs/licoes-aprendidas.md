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

- **2026-09-28 · tabela nova no deploy** · `project_prds` e `project_artifacts` entraram no sync: a leitura tolera tabela ausente (volta vazio), mas a gravação falha e trava criar projeto/PRD em produção. · Tabela nova no `supabase-sync` = migration aplicada no Supabase de produção junto com o deploy; lista em ordem em `docs/deploy-vercel-supabase.md`.

- **2026-09-21 · chaves Supabase** · Dashboard migrou de anon/service role para publishable/secret. · Env: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` na Vercel; fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY` só transição. Secret reservada ao servidor; app no browser continua RLS + JWT.

- **2026-09-21 · projeto sumindo online** · IA gerava e a tela ficava em branco. · `flushSnapshotToSupabase` era fire-and-forget + `window.location` recarregava antes do Postgres; corrigir com `persistNow()` antes de navegar e erros visíveis do Supabase.

- **2026-09-21 · RLS profiles** · Flush fazia upsert com `role` sem policy de insert. · Migration `20250921193000_profiles_rls_sync.sql` + sync só update/insert bootstrap sem role no patch comum.

- **2026-09-17 · criar projeto** · Sem plano da IA, o mock ainda gera requisito + duas telas + versão 1 + débito de créditos. Com plano OpenRouter, requisitos e telas vêm do JSON validado.

## IA / OpenRouter

- **2026-09-17 · chave** · IA mockada não serve. · Chave colada no admin, gravada em `.env.local` (gitignore); em produção, `OPENROUTER_API_KEY` é secret. Sem chave no cliente. Leitura por request (`loadOpenRouterKey()`), sem depender de restart.

- **2026-09-19 · consumo IA** · Não havia visão de tokens no admin. · Aba **Consumo**: chamadas, tokens e USD estimado a partir das respostas da OpenRouter/Gemini. Arquivo local gitignore; não é fatura real.

- **2026-09-19 · catálogo de modelos** · O dropdown só listava OpenRouter `:free`. · Buscar modelos junta OpenRouter (gratuitos) e Google AI Studio; o rótulo começa com `Openrouter:` ou `Google Ai Studio:`.

- **2026-09-28 · fallback pago da OpenRouter** · O uso mostrou `openai/gpt-4o-mini` respondendo no lugar do `:free` configurado: a OpenRouter cai para outros modelos da lista `models` quando o primeiro falha ou está lotado. · Ao investigar formato ou custo, conferir no Consumo qual modelo respondeu de fato; não atribuir o comportamento ao modelo configurado sem olhar.

- **2026-09-28 · fallback só gratuito** · Decisão do usuário: evitar custo inesperado. O padrão da cadeia era todo pago e o `z-ai/glm-5.2:free` configurado saiu da lista de gratuitos, então toda chamada caía no `gpt-4o-mini`. · Fallback aceita só `:free` e o roteador `openrouter/free` (primeiro da cadeia padrão, sobrevive a modelo gratuito que some); pago só como principal escolhido no admin. Padrão sem modelo = `openrouter/free` (spec 005 AC-10; migration `20250930120000_ai_settings_free_default.sql`). Modelo gratuito some da OpenRouter sem aviso: revisar a escolha no admin quando o Consumo mostrar outro modelo respondendo.

- **2026-09-19 · frases de espera** · As 5 linhas se repetiam. · Overlay embaralha ~30 frases no tom unicórnio/briefing a cada geração.

- **2026-09-28 · entrevista antes do plano** · Planejamento saía direto do briefing, raso. · Novo projeto passa por entrevista (analista sênior, uma pergunta por vez com recomendação) → PRD → aprovação; só então requisitos e telas. Gate no repositório e na UI. Spec `014-entrevista-prd`.

- **2026-09-28 · modelo gratuito fora do formato** · Modelo `:free` às vezes devolvia pergunta sem opções ou com "Outros". · Parser rígido; prompt proíbe "Outros" (o texto livre já cobre).

- **2026-09-28 · ajustar resposta** · Usuário pediu para voltar e corrigir respostas da entrevista. · "Ajustar" em cada resposta; muda só aquela, mantém as demais e a pendente (spec 014 AC-12). Com PRD em revisão, ajustar passa por "Voltar à entrevista".

- **2026-09-28 · várias respostas por pergunta** · Usuário pediu marcar mais de uma opção. · Opções viram caixas de seleção + texto livre; "Responder" grava tudo numa resposta só (opções na ordem exibida, texto por último, separados por "; "). Clique único não responde mais. Spec 014 AC-4.

- **2026-09-28 · PRD no export** · O `prd.md` do ZIP era só um resumo de requisitos e telas; o PRD da entrevista não ia para a IDE. · `prd.md` = PRD aprovado; arquivos das IDEs mandam ler `prd.md`/`screens.md` com as regras (P0 primeiro, critério vira teste, fora de escopo, perguntas em aberto, recursos); `PROMPT.md` e o prompt copiado embutem o PRD. Montagem em `src/lib/export/package.ts` (spec 014 AC-13).

- **2026-09-28 · repetir não corrige** · Repetir o mesmo pedido fazia o modelo errar igual (pergunta sem opções duas vezes). · Nova tentativa manda à IA a resposta ruim + o motivo do erro; até 3 chamadas.

- **2026-09-28 · só PRD não basta** · A auditoria mostrou que o app cobria o PRD, mas não TRD, fluxo, UI/UX, backend nem plano de implementação (havia só pedaços soltos, sem ligação com o PRD). · Cadeia de documentos a partir do PRD aprovado, com revisão e aprovação em cada etapa, todos na exportação (spec 015). Novo documento de produto entra na cadeia e no export, não como página solta.

- **2026-09-28 · exportar sem documentos** · Quem ia direto para Exportar baixava um pacote sem TRD, fluxo, UI/UX, backend e plano. · "Gerar pacote" completa a cadeia (gera os que faltam, aprova os em revisão, mostra "Gerando X — n de N") e baixa o ZIP; "Download ZIP" baixa só o aprovado. Geração de documento compartilhada em `src/lib/projects/request-artifact.ts` (spec 015 AC-8). Usuário confirmou: aprovar automaticamente os em revisão é o comportamento desejado.

- **2026-09-28 · Mermaid de modelo gratuito** · O fluxo veio com `-->| "texto" |` (espaços em volta das aspas) e o diagrama não renderizava. `mermaid.parse` no Node não serve de validador (precisa de DOM). · Prompt com regras de sintaxe; normalização determinística no servidor; validação no navegador antes de salvar, com até 2 pedidos de correção; visualização mostra o código e um aviso se ainda falhar.

- **2026-09-28 · SQL gerado com furo de RLS** · O esquema veio com id `serial` comparado a `auth.uid()`, policy de insert com `using` e tabela de senha. · Prompt exige uuid, `user_id` → `auth.users`, login no Supabase Auth, `with check` no insert e `exists` nas filhas. Ainda é proposta: revisar antes de aplicar.

- **2026-09-28 · recursos recomendados alucinados** · Sem âncora, o modelo gratuito não sugeria skills/repos e inventava "plano gratuito" de gateway pago. · Catálogo curado (`src/lib/ai/resource-catalog.ts`) no prompt; serviço só do catálogo, com limite gratuito do catálogo; links do GitHub conferidos na API pública (some inexistente/arquivado). Revisar o catálogo quando planos mudarem.

## UI e fluxos

- **2026-09-17 · telas** · Preview era stub “Wireframe inicial”, sem os componentes. · HTML deriva de nome, rota, descrição e componentes (`buildWireframeHtml`). Prévia com `iframe srcDoc`, não `data:` URL. Spec `007-screen-wireframe`.

- **2026-09-19 · editar detalhes** · Opções → Editar só mudava o texto, sem aviso. · Dashboard e overview têm **Editar detalhes**. Confirmar refaz o plano e limpa busca/análise/radar/personas/banco. Cancelar não grava.

- **2026-09-28 · trilha do projeto** · Header com todas as seções não dizia por onde começar nem o que faltava. · Entrada do projeto é `/projects/<id>` (trilha com % e status por etapa, spec 016); navegação em menu lateral (gaveta no mobile). Regra de progresso em `src/lib/projects/journey.ts`; nova etapa entra lá e na spec, não só no menu.

- **2026-09-28 · editar projeto** · Pedido do usuário: editar ficava escondido em Planejar e não mexia no status. · **Editar projeto** no topo do menu lateral (e em Planejar) volta o status para rascunho e abre `/projects/<id>/edit` com nome e ideia; arquivado não muda; bloqueado enquanto o PRD não for aprovado (spec 011, AC-4 e AC-5). Chegada da trilha: "Pronto para Desenvolvimento".

- **2026-09-28 · menu lateral em todo o app** · Pedido do usuário: o mesmo menu lateral do projeto em todo o sistema. · Esqueleto único `SideShell` (menu fixo em lg+, gaveta no mobile) usado por `AppShell` e `ProjectShell`; seções do admin viram rotas `/admin/<seção>` no menu, sem abas (spec 017). Tela nova autenticada usa um desses shells, nunca header próprio.

## Armadilhas técnicas

- **2026-09-28 · gradiente do logo sumindo** · Mesmo `markId` no menu do desktop (oculto com `display:none`) e na gaveta mobile: o `<linearGradient>` do elemento oculto não pinta o outro. · Um `markId` por instância do `Logo` renderizada ao mesmo tempo.

- **2026-09-17 · lottie-react v3** · `import Lottie from "lottie-react"` + `animationData` quebrou o build (“Export default doesn't exist”). · Import nomeado `{ Lottie }` e prop `src`.

- **2026-09-28 · node:fs no cliente** · Página client importava helper de `openrouter.ts`, que puxa `persist-env` (`node:fs`); Turbopack quebrou o build. · Helpers usados no browser ficam em módulos puros (`src/lib/ai/json.ts`); do `openrouter.ts` só `import type`.

- **2026-09-28 · pergunta duplicada** · Remount em dev disparava duas chamadas e criava duas perguntas pendentes. · Repositório recusa segunda pendente; UI com trava single-flight.

- **2026-09-28 · plano sem seções** · Documentos técnicos pedem Markdown, mas `completeLlm` liga `response_format: json_object` por padrão; com contexto grande (PRD + 4 documentos) o modelo que respondeu (fallback da OpenRouter) obedecia e devolvia JSON sem sentido (`{"error":"Invalid request"}`), e o validador acusava "Faltaram as seções". · Rota que espera texto livre passa `json: false`; resposta em JSON é recusada com motivo claro. Para diagnosticar formato, ver a resposta bruta antes de afrouxar o validador.

- **2026-09-17 · PowerShell** · `&&` não encadeia comandos nesta shell. · Comandos separados ou `;`.

- **2026-09-17 · sessão** · Código lia `session.role` / `session.name`. · Sessão mock é `{ user }`; nome e papel estão em `session.user`.

- **2026-09-17 · overview** · Loop infinito no bundle do projeto. · `useMemo` em `useProjectBundle`.

- **2026-09-17 · navegação pós-plano** · `router.push` após gerar o projeto às vezes não ia. · `window.location.assign` para o overview.

- **2026-09-17 · porta 3001** · Dev preso / CPU alta. · Matar o Node preso e `npm run dev` de novo (`next dev -p 3001`).

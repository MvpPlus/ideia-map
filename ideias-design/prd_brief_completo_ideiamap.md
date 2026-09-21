# PRD & Product Brief — IdeiaMap ("Sua ideia, pronta para construir")

**Status:** Aprovado para Desenvolvimento  
**Versão:** 1.0.0  
**Autor:** Equipe de Produto & Engenharia IdeiaMap  
**Público-Alvo:** Desenvolvedores Vibe Coders, Founders Não-Técnicos, Product Managers e Desenvolvedores de Agentes Autônomos  

---

## 1. Visão Geral do Produto & Proposta de Valor

### 1.1 O que é o IdeiaMap?
O **IdeiaMap** é uma plataforma SaaS que transforma ideias conceituais de software e links de concorrentes (analisados via web scraping) em **especificações técnicas completas, schemas de banco de dados e pacotes de prompts hiper-estruturados** para IDEs de IA (Cursor, Claude Code CLI, Codex/GPT-Engineer, Antigravity e Markdown PRD tradicional).

### 1.2 O Problema do Mercado
1. **Alucinação e Desperdício de Tokens:** Ferramentas como Cursor ou Claude Code falham ou entram em loops caros quando recebem prompts genéricos ("crie um CRM para imobiliária").
2. **Falta de Contexto Técnico para Founders Não-Técnicos:** Empreendedores têm clareza do produto, mas têm dificuldade em estruturar schemas relacionais (Postgres, RLS, Foreign Keys), árvores de rotas e regras de negócio.
3. **Falta de Referência Competitiva Automatizada:** Founders precisam inspecionar manualmente concorrentes para entender fluxos e requisitos.

### 1.3 A Solução do IdeiaMap
- **Ingestão Dupla:** Ideia em linguagem natural + URLs de produtos similares para benchmarking visual e estrutural.
- **Engine de Decomposição Modular:** Quebra a ideia em 4 artefatos obrigatórios:
  1. *Árvore de Telas & Rotas* (Next.js App Router).
  2. *Schema Relacional* (PostgreSQL / Supabase com RLS).
  3. *Regras de Negócio & Casos de Borda* (Gherkin / Acceptance Criteria).
  4. *Planos de Execução em Micro-Tasks* (prompts < 20 linhas para agent loops).
- **Exportação Multi-Agente:** Geração nativa com 1 clique de arquivos `.cursorrules`, `CLAUDE.md`, pacotes ZIP e comando CLI (`npx ideiamap pull --project-slug`).

---

## 2. Personas & Casos de Uso

| Persona | Perfil | Job to Be Done | Métrica de Sucesso |
| :--- | :--- | :--- | :--- |
| **Vibe Coder / Solopreneur** | Técnico / Híbrido, usa Cursor e Claude Code diariamente | Quer gerar o esqueleto funcional e regras estritas sem perder 4 horas configurando boilerplate | Tempo de setup do projeto reduzido de 5 horas para 5 minutos |
| **Founder Não-Técnico** | Conhece a dor de negócio, usa ferramentas no-code ou LLMs web | Quer transformar uma ideia de SaaS em especificação profissional sem contratar arquiteto | PRD 100% livre de termos vagos e pronto para repassar à IA |
| **Agência de Software** | Desenvolve protótipos rápidos e MVPs para clientes | Quer acelerar a fase de discovery e orçamentação com engenharia reversa de concorrentes | Geração de proposta técnica e arquitetura em 10 minutos |

---

## 3. Arquitetura de Funcionalidades (Scope & Features)

### Módulo 1: Intake & Planejamento Inteligente
- **Input de Linguagem Natural:** Campo com suporte a 2.000 caracteres, detecção automática de nicho e chips de vetor arquitetural (Multi-tenant, Stripe, RLS, Webhooks).
- **Web Scraping & Reverse Spec Engine:**
  - Ingestão de URLs concorrentes (landing pages, telas de pricing, documentações públicas).
  - Extração de cabeçalhos, formulários, componentes UI e inferência de stack (ex: Next.js + Tailwind + Supabase).
  - Geração de "Insights de Engenharia Reversa" automáticos.
- **Seletor de Modelo de Síntese:** Suporte a Claude 3.7 Sonnet (Thinking), GPT-4.5 Omni Preview e DeepSeek R1.

### Módulo 2: Visualizador de Artefatos Gerados
- **Telas & Rotas Mapeadas:** Lista de rotas `/dashboard`, `/leads/kanban`, `/settings` com visualização de componentes previstos e badge de status `Spec Pronta`.
- **Schema Relacional Interativo:** Representação visual de tabelas SQL (`workspaces`, `leads`, `profiles`), tipos de dados, chaves primárias, relacionamentos `FK` e status de RLS (*Row Level Security*).
- **Histórias de Usuário & Regras de Negócio:** Critérios de aceitação estritos com métricas objetivas (ex: "tempo de resposta < 800ms", "validação via Zod").

### Módulo 3: Central de Exportação Multi-Agente
- **Presets de Formatação:**
  - **Cursor IDE:** Arquivo `.cursorrules` com diretrizes anti-alucinação, convenções de código e restrições de bibliotecas.
  - **Claude Code CLI:** Arquivo `CLAUDE.md` focado em diretrizes de terminal e build verification.
  - **Codex / GPT-Engineer:** System prompts compactos e focados em micro-tasks.
  - **Antigravity:** Configuração com loops autônomos e gates de verificação.
  - **Markdown Puro:** PRD completo e estruturado para documentação de produto.
- **Seletor Granular de Módulos:** Checkbox para incluir/remover seções no arquivo final compilado.
- **Token Budget Estimator:** Indicador visual de consumo de tokens (ex: `~8.420 / 32k tokens`) garantindo que o PRD caiba na janela de atenção rápida das LLMs.
- **CLI Sync:** Comando `npx ideiamap pull --slug` com cópia instantânea.

---

## 4. Requisitos Não-Funcionais & Diretrizes Técnicas

### 4.1 Performance & Latência
- **Streaming de Respostas:** O planejamento e geração dos artefatos deve usar Vercel AI SDK com streaming estruturado via `streamObject` (Zod), com rendering progressivo no frontend em menos de 1.5s após o clique.
- **Scraping Timeout:** Limite de 8 segundos por URL de scraping com fallback gracioso caso o site bloqueie bots.

### 4.2 Segurança & Isolamento
- **Multi-Tenant com Supabase RLS:** Todo projeto pertence a um `workspace_id` e `user_id`. Nenhuma query pode vazar dados entre usuários.
- **Sanitização de HTML:** Sanitização obrigatória de payloads capturados por scraping para prevenir injeção XSS.

### 4.3 Design System & Responsividade
- **Tema:** Dark Mode moderno (`#0f131c`), com paleta de destaque em Indigo (`#6366f1`) e acentos esmeralda/ciano para estados de sucesso e dados técnicos.
- **Tipografia:** *Outfit* para títulos e métricas, fonte monoespaçada para trechos de código e schema SQL.
- **Dispositivos:** Compatibilidade 100% responsiva (Desktop e Mobile ~390px com Bottom Navigation nativa).

---

## 5. Roadmap de Lançamento (MVP)

| Fase | Foco | Entregáveis |
| :--- | :--- | :--- |
| **Fase 1: Core Engine** | Backend & AI Pipeline | Setup Supabase, rotas de API com Vercel AI SDK, scraper via Cheerio e geração de JSON estruturado. |
| **Fase 2: Interface Web** | Telas Desktop & Mobile | Implementação das telas no Next.js 15 (Planejador com Scraping + Exportação Multi-Agentes). |
| **Fase 3: Compiladores de Agentes** | Exportação e Formatação | Parsers para `.cursorrules`, `CLAUDE.md`, download em ZIP e endpoints de CLI pública. |
| **Fase 4: Polimento & Beta** | Testes e Métricas | Testes de alucinação no Cursor, telemetria de tokens e onboarding de early adopters. |

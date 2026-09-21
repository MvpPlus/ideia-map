# Spec: pesquisa (análise, competitivo, personas, banco)

Status: aceito  
Fase: mock + OpenRouter + fetch Cheerio  
Fora: Playwright, crawler autenticado, diagrama ER pesado, Supabase real

## Contexto

URL pública vira texto no servidor (8s). O modelo **Prompt** sintetiza os quatro artefatos. PRD continua no plano; Chat no overview.

## Critérios

### AC-1 URL pública
Dado um host privado ou esquema inválido, quando valida a URL, então recusa.

### AC-1b Coleta recusada pelo destino
Dado HTTP 403 do site alvo, quando a coleta falha, então a mensagem explica bloqueio anti-bot/login (não culpa só o IdeiaMap). A requisição usa User-Agent de navegador comum.

### AC-2 Texto sem script
Dado HTML com `script`, quando extrai, então o texto não inclui o conteúdo do script.

### AC-3 Prompt na síntese
Dado JSON de pesquisa, quando valida, então análise tem descobertas, competitivo tem concorrentes, personas têm nome, e banco tem tabela.

### AC-4 Persistência
Dado um projeto do dono, quando grava análise, então a leitura devolve as descobertas.

### AC-5 Busca na web
Dado nome e descrição do app, quando monta a query, então inclui o nome e um recorte da ideia (não fica vazia).

A busca roda no servidor: Google Programmable Search se houver `GOOGLE_API_KEY` + `GOOGLE_CSE_ID`; senão DuckDuckGo HTML com fallback para a API JSON se o HTML retornar 403 (comum na Vercel). Não raspa `google.com`. Os snippets alimentam análise e radar de mercado.

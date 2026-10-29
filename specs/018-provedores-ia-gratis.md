# Spec: provedores de IA gratuitos (Groq + Mistral + Cloudflare)

Status: aceito  
Fase: chaves em `.env.local`; persistência mock  
Fora: chave no cliente, Telegram, cobrança paga implícita, AI Gateway da Cloudflare (só Workers AI direto)

## Contexto

Além de OpenRouter e Google AI Studio, o admin cola chaves gratuitas da Groq, da Mistral e da Cloudflare Workers AI. O servidor equilibra chamadas (round-robin) entre todos os provedores com chave e, se um falhar (cota, 5xx, rate limit), o próximo assume com o modelo free padrão daquele provedor — o fluxo do usuário não quebra.

Cloudflare exige **API token** e **Account ID** (ambos no admin / env).

## Critérios

### AC-1 Chaves no env
Dado um `.env.local`, quando grava `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CLOUDFLARE_API_TOKEN` ou `CLOUDFLARE_ACCOUNT_ID`, então a leitura devolve o valor e as outras linhas (incluindo OpenRouter/Google) permanecem.

### AC-2 Balance com cinco
Dado OpenRouter, Google, Groq, Mistral e Cloudflare disponíveis, quando pede a ordem cinco vezes, então cada chamada começa no próximo provedor (round-robin).

### AC-3 Complete OpenAI-compatible
Dado chave e mensagens, quando completa via Groq, Mistral ou Cloudflare, então o POST vai para o endpoint chat/completions do provedor com `Authorization: Bearer` e devolve texto + provedor no consumo. Cloudflare usa `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1`.

### AC-4 Failover
Dado dois ou mais provedores com chave, quando o primeiro da ordem falha, então o servidor tenta o próximo até um responder; só falha se nenhum responder.

### AC-5 Catálogo e rótulos
Dado chaves Groq, Mistral e/ou Cloudflare, quando busca modelos, então a lista inclui esses provedores. Os nomes no dropdown começam com `Groq:`, `Mistral:` ou `Cloudflare:` (além de OpenRouter e Google Ai Studio).

### AC-6 Status mascarado
Dado chaves Groq/Mistral/Cloudflare configuradas, quando o cliente pede o status, então recebe flags `groqConfigured` / `mistralConfigured` / `cloudflareConfigured` e máscaras do token — nunca o token completo. Account ID pode aparecer mascarado ou parcial.

### AC-7 Cloudflare incompleto
Dado só token ou só Account ID da Cloudflare, quando o servidor monta os provedores disponíveis, então Cloudflare **não** entra na lista até os dois estarem preenchidos.

# Spec: OpenRouter real (local)

Status: aceito  
Fase: IA via OpenRouter; persistência ainda `localStorage`  
Fora: crawler, Stripe, Supabase, chave no repositório

## Contexto

O admin cola a chave no painel. O servidor grava `OPENROUTER_API_KEY` em `.env.local` (já no gitignore) e lê o arquivo a cada chamada, sem exigir restart. Em produção (Supabase/Vercel) a mesma variável vira secret do provedor — o filesystem pode ser só leitura e a rota avisa.

## Critérios

### AC-1 Sem chave
Dado `OPENROUTER_API_KEY` vazia, quando o servidor tenta completar um chat, então falha com erro explícito de configuração.

### AC-2 Chamada
Dado uma chave e mensagens, quando completa o chat, então o POST vai para `https://openrouter.ai/api/v1/chat/completions` com `Authorization: Bearer`.

### AC-3 Plano JSON
Dado um texto de modelo com JSON de requisitos e telas, quando valida o plano, então exige ao menos um requisito e duas telas.

### AC-5 Gravar no env local
Dado um arquivo `.env.local` com outras variáveis, quando o admin salva uma chave OpenRouter, então o texto passa a ter `OPENROUTER_API_KEY` com o valor novo e as outras linhas permanecem.

### AC-6 Status mascarado
Dado uma chave configurada, quando o cliente pede o status, então recebe `configured: true` e uma máscara — nunca a chave completa.

### AC-8 Falha do provedor
Dado um 502 genérico `Provider returned error` com `response_format` JSON, quando completa o chat, então tenta de novo sem JSON forçado e, se a segunda resposta vier, usa esse texto.

### AC-9 Roteamento
Dado um modelo que falha com rate-limit mesmo sem JSON, quando completa o chat, então tenta os próximos da cadeia (até 5 modelos no cliente). No POST, o array `models` da OpenRouter tem no máximo 3 IDs.



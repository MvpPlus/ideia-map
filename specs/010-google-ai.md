# Spec: Google AI Studio + balance OpenRouter

Status: aceito  
Fase: chaves em `.env.local`; persistência mock  
Fora: chave no cliente, crawler Google, billing

## Contexto

O admin cola a chave gratuita do Google AI Studio. O servidor equilibra chamadas entre OpenRouter e Gemini e, em cada um, tenta até 5 modelos.

## Critérios

### AC-1 Chave Google
Dado um `.env.local`, quando grava `GOOGLE_AI_STUDIO_API_KEY`, então a leitura devolve o valor e as outras linhas permanecem.

### AC-2 Balance
Dado OpenRouter e Google configurados, quando pede a ordem duas vezes, então a primeira começa em um provedor e a segunda no outro.

### AC-3 Cadeia Google
Dado um modelo Gemini, quando monta a rota, então há até 5 IDs e o primeiro é o pedido (ou o primeiro da lista gratuita).

### AC-4 Catálogo dos dois
Dado chaves OpenRouter e Google, quando busca modelos, então a lista traz os dois provedores. Os nomes no dropdown começam com `Openrouter:` ou `Google Ai Studio:`.

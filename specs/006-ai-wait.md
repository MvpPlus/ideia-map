# Spec: espera da geração com IA

Status: aceito  
Fase: mock UI + OpenRouter  
Fora: tempo real da API, crawler

## Contexto

Enquanto o plano é gerado, o usuário vê overlay com animação, frases e barra de progresso.

## Critérios

### AC-1 Overlay
Dado o envio de um novo projeto, quando a OpenRouter ainda não respondeu, então a tela mostra overlay de espera (não só o texto do botão).

### AC-2 Progresso
Dado o overlay aberto, quando o tempo passa, então a barra avança e não ultrapassa 92% até a geração terminar.

### AC-3 Frases
Dado o overlay aberto, quando a espera continua, então há ao menos 30 frases no tom do briefing/unicórnio, e a ordem da sessão é aleatória (sem repetir até esgotar o baralho).

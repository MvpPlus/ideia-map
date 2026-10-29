# Spec: bot Telegram (admin + login + projetos)

Status: aceito  
Fase: mock servidor + supabase  
Fora: Storage permanente de mídia, grupos Telegram, cadastro pelo bot, sincronizar mock do bot com `localStorage` do browser

## Contexto

O admin configura o bot IdeiaMap no painel. O Telegram envia updates para `/api/telegram`. O usuário faz login com o mesmo e-mail/senha da plataforma, vê os projetos em botões, navega a trilha e gera/lê documentos — sempre podendo escrever texto livre.

## Critérios

### AC-1 Seção Admin
Dado um admin, quando abre Administração → Telegram (`/admin/telegram`), então pode colar token e secret do webhook, ver máscaras (nunca o valor completo) e registrar o webhook na URL do site.

### AC-2 Webhook protegido
Dado `TELEGRAM_WEBHOOK_SECRET` configurado, quando um POST chega em `/api/telegram` sem o header `X-Telegram-Bot-Api-Secret-Token` correto, então a rota responde 401. Sem token do bot, 503.

### AC-3 Login
Dado `/start` e o botão Entrar, quando o usuário informa e-mail e senha válidos, então a sessão Telegram fica ligada ao `user_id` e o menu home aparece. Senha vazia ou inválida (Supabase) falha com mensagem clara.

### AC-4 Projetos do dono
Dado um usuário logado no bot, quando escolhe Meus projetos, então só vê projetos dele (botões). Sair limpa a sessão Telegram.

### AC-5 Botões e texto
Dado o menu home ou um projeto aberto, então há teclado inline com as ações principais e mensagens de texto livres continuam sendo aceitas (ajuda ou atalho).

### AC-6 Documentos em pedaços
Dado um documento Markdown longo, quando o bot envia ao chat, então a mensagem é fatiada em partes com no máximo 3500 caracteres cada.

### AC-7 Chunk utilitário
Dado um texto de 8000 caracteres, quando `chunkTelegramText` roda, então há ao menos 3 pedaços e nenhum ultrapassa o limite.

# Spec: chat flutuante do projeto (+ anexos)

Status: aceito  
Fase: mock + supabase  
Fora: Telegram, Storage permanente de arquivos, vídeo, OCR de PDF escaneado, DOCX

## Contexto

Dentro de qualquer tela de um projeto (`/projects/[id]/*`), o usuário abre um chat por uma bolha flutuante. A IA recebe o contexto do **projeto inteiro** e da **página atual**, e pode receber anexos efêmeros (imagem, documento texto/PDF, áudio). A espera é só o balão de digitando — sem overlay de tela cheia.

## Critérios

### AC-1 Bolha nas rotas do projeto
Dado um projeto aberto em qualquer etapa (trilha, entrevista, overview, docs, etc.), então há uma bolha flutuante que abre o painel de chat; fora de `/projects/[id]…` a bolha não aparece.

### AC-2 Contexto projeto + página
Dado o pathname da etapa atual e o estado do projeto, quando monta o contexto do chat, então o texto inclui a seção da página atual (com dados daquela etapa) e um resumo do projeto (nome, descrição, requisitos, telas e demais artefatos existentes), sem ultrapassar o teto de caracteres.

### AC-3 Digitanda sem overlay
Dado o painel aberto, quando o usuário envia mensagem (com ou sem anexo), então a mensagem entra na lista na hora, aparece o balão de digitando e **não** há overlay de tela cheia.

### AC-4 Imagem
Dado um anexo `image/jpeg|png|webp|gif` dentro do limite, quando envia, então a chamada usa um provedor com visão (Google AI Studio preferencial); sem chave/visão configurada, a API responde erro explícito.

### AC-5 Documento
Dado um anexo `.txt`, `.md` ou `.pdf` dentro do limite, quando envia, então o texto extraído entra no contexto do pedido (truncado se necessário).

### AC-6 Áudio
Dado um anexo de áudio suportado e `GROQ_API_KEY` configurada, quando envia, então o áudio é transcrito (Whisper) e a transcrição entra no contexto; sem chave Groq, erro explícito.

### AC-7 Thread do projeto
Dado mensagens enviadas em etapas diferentes do mesmo projeto, quando lista o chat, então todas aparecem no mesmo thread daquele `project_id`.

### AC-8 Controles do painel
Dado o painel aberto, então há ícone de clipe para anexar arquivos, ícone de microfone para gravar áudio no navegador, e a bolha flutuante mostra ícone de balão de conversa com o rótulo Chat. Ao parar a gravação, a mensagem é enviada na hora (sem clicar em Enviar) e o arquivo gerado não aparece como chip de anexo; enquanto transcreve, **não** há balão com `…` nem digitando — o texto só entra no histórico quando a transcrição chega.

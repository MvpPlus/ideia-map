# Spec: núcleo mock (local)

Status: aceito  
Fase: dados mock + UI Next.js  
Fora: crawler, OpenRouter real, Stripe, Supabase, análise/competitivo/personas/banco além do placeholder

## Contexto

O usuário planeja produtos no browser. Persistência é `localStorage`. Auth é sessão mock.

## Critérios

### AC-1 Login exige senha
Dado um e-mail, quando a senha está vazia, então o sistema recusa com erro.

### AC-2 Papel admin
Dado o e-mail `admin@ideiamap.dev`, quando autentica com senha não vazia, então `role` é `admin`.

### AC-3 Criar projeto gera artefatos
Dado um usuário autenticado, quando cria um projeto com nome e descrição, então existem o projeto, ao menos um requisito, duas telas, versão 1 e um débito de créditos.

### AC-4 Duplicar
Dado um projeto com requisitos, quando duplica, então a cópia tem outro `id`, nome com `(cópia)` e requisitos próprios.

### AC-5 Arquivar
Dado um projeto ativo, quando arquiva, então `is_archived` é verdadeiro e `status` é `archived`.

### AC-6 Excluir
Dado um projeto, quando exclui, então projeto, requisitos e telas desse `id` desaparecem.

### AC-7 Salvar versão
Dado um projeto na versão N, quando salva versão, então o número vira N+1 e o status fica `ready`.

### AC-8 Chat propõe requisito
Dado o workspace, quando envia uma mensagem no chat, então há mensagens user e assistant e um requisito novo com prioridade `média`.

### AC-9 Export acompanha versão
Dado a última versão salva V, quando gera export, então o registro usa `version_number = V` e `status = ready`.

### AC-10 Lista só do dono
Dado dois usuários, quando lista projetos, então cada um vê apenas os seus.

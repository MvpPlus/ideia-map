# Spec: navegação e layout responsivos

Status: aceito  
Fase: mock UI  
Fora: novas rotas, backend

## Contexto

O app precisa ser usável em telefone (~375px) e desktop (~1280px). Ações de sessão e de projeto não podem desaparecer só porque a tela é estreita.

## Critérios

### AC-1 Menu mobile no app
Dado um usuário autenticado em viewport abaixo de `lg`, quando abre o Menu, então vê Projetos, Perfil, Administração (se admin) e Sair.

### AC-2 Sair no desktop
Dado o trilho em `lg+`, então Sair permanece visível sem abrir menu.

### AC-3 Menu do projeto
Dado o workspace em viewport abaixo de `lg`, quando abre o Menu, então vê as seções (incluindo em breve) e Fechar projeto, sem depender de scroll horizontal para achar a seção ativa.

### AC-4 Chat mobile
Dado o overview no telefone, quando toca em Chat, então o painel ocupa a tela em coluna, com Fechar visível, e o FAB não cobre os toasts.

### AC-5 Prévia de tela
Dado o editor de telas no telefone, então o iframe não força scroll horizontal da página (`max-width: 100%`).

### AC-6 Login mobile
Dado `/` abaixo de `lg`, então o formulário inclui uma linha de slogan (o mapa ilustrado pode ficar oculto).

# Spec: landing pública

Status: aceito  
Fase: mock UI  
Fora: Stripe, scraping real, IA real, AppShell na home

## Contexto

Visitantes veem marketing em `/`. Autenticação fica em `/login`.

## Critérios

### AC-1 Visitante vê marketing
Dado alguém sem sessão em `/`, então a página mostra o slogan e CTAs para criar conta ou entrar — não o campo de senha.

### AC-2 Sessão redireciona
Dado um usuário autenticado que abre `/`, então o destino é `/dashboard`.

### AC-3 Login permanece
Dado `/login`, quando autentica com senha não vazia, então entra no app como no núcleo mock.

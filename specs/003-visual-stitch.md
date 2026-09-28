# Spec: visual Stitch (dark)

Status: aceito  
Fase: mock UI  
Fora: novos fluxos, scraping real, Material Symbols obrigatório

## Contexto

O design system em `ideias-design` é dark slate com Outfit/Inter, índigo e esmeralda. Todas as telas existentes adotam esse visual.

## Critérios

### AC-1 Fundo dark
Dado qualquer rota autenticada ou de auth, então o canvas é escuro (`#0B0F17` / `#0f131c`) e o texto principal é claro.

### AC-2 Navegação desktop
Dado viewport `lg+` em qualquer rota autenticada, então a navegação fica num menu lateral esquerdo (`specs/017-menu-lateral-app.md`; no projeto, `specs/016-trilha-projeto.md`).

### AC-3 Navegação mobile
Dado viewport abaixo de `lg` em qualquer rota autenticada, então existe barra superior com Menu, que abre o menu lateral como gaveta.

### AC-4 Logo
Dado o header, então o wordmark IdeiaMap usa o símbolo em gradiente e “Map” em índigo.

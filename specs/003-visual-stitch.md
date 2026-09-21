# Spec: visual Stitch (dark)

Status: aceito  
Fase: mock UI  
Fora: novos fluxos, scraping real, Material Symbols obrigatório

## Contexto

O design system em `ideias-design` é dark slate com Outfit/Inter, índigo e esmeralda. Todas as telas existentes adotam esse visual.

## Critérios

### AC-1 Fundo dark
Dado qualquer rota autenticada ou de auth, então o canvas é escuro (`#0B0F17` / `#0f131c`) e o texto principal é claro.

### AC-2 Header desktop
Dado viewport `lg+`, então a navegação fica num header horizontal (não trilho esquerdo).

### AC-3 Bottom nav mobile
Dado viewport abaixo de `lg` no app ou no projeto, então existe barra inferior fixa com as seções principais.

### AC-4 Logo
Dado o header, então o wordmark IdeiaMap usa o símbolo em gradiente e “Map” em índigo.

---
name: sdd-tdd
description: Runs Spec-Driven Development then Test-Driven Development for IdeiaMap. Use when implementing features, changing domain behavior, adding screens, writing tests, or when the user mentions TDD, SDD, spec, critério de aceite, or red-green-refactor.
---

# SDD → TDD no IdeiaMap

## Quando aplicar

Qualquer mudança de comportamento (domínio, rotas, auth, créditos, export, admin). Estilo visual puro pode pular TDD, mas ainda atualiza a spec se o fluxo mudar.

## Passos

1. Localize ou crie `specs/<nn>-<slug>.md` com contexto, fora de escopo e critérios `AC-n`.
2. Liste os `AC-n` tocados nesta tarefa. Ignore o resto.
3. Para cada `AC-n`, neste ordem:
   - Escreva um teste em `src/**/*.test.ts` (ou coloque ao lado do módulo) nomeado com o ID.
   - Rode `npm test -- <arquivo>` e confirme **falha**.
   - Implemente o mínimo.
   - Rode de novo até **passar**.
   - Refatore se o código pediu.
4. Rode `npm test` no fim.
5. Se o adapter mock mudou o contrato, anote na spec o que o Supabase deverá cumprir igual.

## Testes

- Preferir `MockAdapter` isolado (`new MockAdapter()`), não o singleton, depois de `localStorage.clear()`.
- Não mockar o próprio comportamento sob teste.
- Nomes: `AC-3 archiveProject marca is_archived`.

## Não fazer

- Gerar mil linhas de UI antes do teste de domínio.
- Expandir escopo além dos `AC-n` da spec ativa.
- Inventar API Supabase nesta fase.

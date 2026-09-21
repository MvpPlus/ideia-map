# Spec: consumo de modelos e tokens

Status: aceito  
Fase: mock  
Fora: fatura real da OpenRouter/Google; Stripe; filtrar por usuário autenticado no servidor

## Contexto

Cada chamada de IA no servidor registra modelo, provedor, tokens e um gasto estimado em USD. O admin vê isso numa aba **Consumo**. A lista fica num arquivo local (gitignore), não no `localStorage` do usuário, porque as chamadas acontecem no servidor. O valor é estimativa de tabela, não a fatura do provedor. Quota gratuita do Google AI Studio pode sair a US$ 0 na prática.

## Critérios

### AC-1 Estimativa por modelo
Dado um modelo conhecido e totais de tokens de entrada e saída, quando calcula o gasto, então o valor em USD usa o preço de tabela daquele modelo (e modelos `:free` saem 0).

### AC-2 Resumo
Dado várias chamadas, quando monta o resumo, então há totais de chamadas, tokens e USD, e também totais por modelo e por provedor.

### AC-3 Aba Consumo
Dado um admin autenticado, quando abre Administração → Consumo, então vê chamadas, tokens, gasto estimado e a lista recente de modelos usados.

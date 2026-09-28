# Spec: menu lateral em todo o app

Status: aceito
Fase: mock
Fora: menu recolhível (só ícones), favoritos, busca global no menu

## Contexto

O projeto já navega por menu lateral (spec 016). Dashboard, novo projeto, perfil e administração ainda usavam header e barra inferior, e o admin trocava de seção por abas horizontais. Todo o app autenticado passa a ter o mesmo esqueleto: menu à esquerda no desktop e gaveta no celular.

## Critérios

### AC-1 Menu geral
Dado um usuário autenticado fora de um projeto, em viewport `lg+`, então há menu fixo à esquerda com: Projetos, Novo projeto, Perfil e (só para admin) Administração; embaixo, nome do usuário e Sair. A tela atual fica destacada. Não há header horizontal nem barra inferior.

### AC-2 Seções do admin no menu
Dado um admin, então Administração mostra no menu as seções OpenRouter, Consumo, Usuários, Planos, Jobs, Templates, Auditoria e Custos; cada uma tem endereço próprio (`/admin/<seção>`, ex.: `/admin/consumo`) e `/admin` abre OpenRouter. Endereço de seção desconhecida abre OpenRouter. Não há abas horizontais.

### AC-3 Mobile
Dado viewport abaixo de `lg`, então há barra superior com Menu e o título da área; Menu abre o mesmo menu como gaveta à esquerda (fecha ao navegar, no fundo escuro, em Fechar ou com Esc), sem scroll horizontal em 375px.

### AC-4 Mesmo esqueleto no projeto
Dado um projeto aberto, então o menu lateral do projeto (spec 016) usa o mesmo esqueleto, largura e comportamento de gaveta do menu geral.

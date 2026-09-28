# Spec: trilha do projeto e navegação lateral

Status: aceito
Fase: mock
Fora: reordenar etapas, etapas personalizadas, gamificação (pontos, medalhas), trilha no dashboard

## Contexto

O workspace do projeto tinha um header com todas as seções lado a lado; o usuário não sabia por onde começar nem o que faltava. A entrada do projeto passa a ser uma trilha em forma de mapa, etapa por etapa, com porcentagem e status, e a navegação vai para um menu lateral à esquerda.

## Etapas (nesta ordem)

| # | Etapa | Tela | Porcentagem |
| --- | --- | --- | --- |
| 1 | Entrevista e PRD | `/interview` | entrevista: 6% por resposta até 60%; PRD em revisão: 80%; aprovado: 100% |
| 2 | Planejar | `/overview` | sem requisitos: 0%; com requisitos: 60%; requisitos salvos pelo usuário (versão 2 ou mais): 100% |
| 3 | Pesquisa | `/analysis` (e Radar, Personas) | um terço para cada: análise feita, concorrente no radar, persona criada |
| 4 | Telas | `/screens` | com telas: 100% |
| 5 | Banco | `/database` | modelo com tabelas: 100% |
| 6 | Documentos técnicos | `/docs` | 20% por documento aprovado, 10% por rascunho |
| 7 | Exportar | `/export` | pacote gerado: 100% |

Status: **concluída** (100%), **em andamento** (entre 1% e 99%), **a fazer** (0%), **bloqueada**, **não se aplica**.

## Critérios

### AC-1 Entrada pela trilha
Dado um projeto, quando o usuário o abre pelo dashboard (ou duplica, ou salva "Editar detalhes"), então cai em `/projects/<id>`, que mostra a trilha com as 7 etapas na ordem acima, cada uma com número, nome, porcentagem e status, terminando na bandeira "Pronto para Desenvolvimento".

### AC-2 Progresso
Dado o estado do projeto, então cada etapa mostra a porcentagem da tabela, e o topo mostra o progresso geral (média das etapas que se aplicam) e quantas estão concluídas.

### AC-3 Bloqueio pelo PRD
Dado um projeto com PRD ainda não aprovado, então só a etapa 1 abre; as demais aparecem bloqueadas com "Abre quando você aprovar o PRD" e não levam a lugar nenhum. A trilha continua acessível; as outras telas redirecionam para a entrevista.

### AC-4 Projeto sem entrevista
Dado um projeto criado antes da entrevista (sem PRD), então "Entrevista e PRD" e "Documentos técnicos" aparecem como não se aplica e ficam fora do progresso geral.

### AC-5 Próximo passo
Dado o estado do projeto, então a primeira etapa (na ordem) que não está concluída nem bloqueada é destacada no mapa e oferecida no topo como "Continuar: <etapa>". Com tudo concluído, o topo diz que o projeto está pronto para exportar de novo.

### AC-6 Pontos do mapa
Dado um ponto não bloqueado, quando o usuário toca nele, então vai para a tela da etapa. A etapa Pesquisa mostra atalhos para Análise, Radar de mercado e Personas.

### AC-7 Menu lateral
Dado viewport `lg+`, então o projeto tem menu fixo à esquerda com: Editar projeto (spec 011, AC-4 e AC-5), Trilha, as 7 etapas (com status e %; Pesquisa com Análise, Radar e Personas), Projetos, Perfil e Sair. A tela atual fica destacada. Não há header horizontal no projeto.

### AC-8 Mobile
Dado viewport abaixo de `lg`, então há uma barra superior com o botão Menu e o nome do projeto; Menu abre o mesmo menu lateral como gaveta à esquerda (fecha ao navegar, no fundo escuro ou em Fechar). A trilha vira vertical, sem scroll horizontal em 375px.

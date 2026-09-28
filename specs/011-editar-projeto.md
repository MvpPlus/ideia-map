# Spec: editar detalhes do projeto

Status: aceito  
Fase: mock  
Fora: regenerar análise/radar/personas/banco automaticamente na hora (só esvaziar); Auth Supabase

## Contexto

Os detalhes (nome e descrição) já existem no dashboard em **Opções → Editar**, mas só gravavam o texto. Mudar o briefing invalida o plano, as telas e a pesquisa já desenhados. O salvamento exige confirmação e, se o usuário confirmar, o planejamento é gerado de novo.

## Critérios

### AC-1 Texto de confirmação
Dado o usuário a salvar detalhes, quando o diálogo abre, então a mensagem avisa que o planejamento, as telas, a busca, a análise, o radar de mercado, as personas e o banco já feitos serão refeitos/substituídos.

### AC-2 Cancelar não altera
Dado o diálogo aberto, quando o usuário cancela, então nome, descrição, requisitos e pesquisa permanecem iguais.

### AC-3 Confirmar substitui o plano
Dado um projeto com requisitos e telas, quando confirma a edição com um plano novo, então nome e descrição atualizam, requisitos e telas passam a ser os do plano, e a análise, o radar, as personas, o modelo de banco e as coletas de URL desse projeto desaparecem.

### AC-4 Onde editar
Dado o dashboard ou o projeto, quando o usuário procura editar detalhes, então há **Editar detalhes** no menu Opções do dashboard e **Editar projeto** no menu lateral do projeto (acima da Trilha) e junto ao título em Planejar; os dois do projeto levam a `/projects/<id>/edit`, com as informações iniciais (nome e ideia). Com o PRD ainda não aprovado, **Editar projeto** fica bloqueado (a ideia se ajusta na entrevista).

### AC-5 Editar volta para rascunho
Dado um projeto pronto, quando o usuário toca em **Editar projeto**, então o status do projeto passa a rascunho antes de abrir a tela de edição. Projeto arquivado continua arquivado.

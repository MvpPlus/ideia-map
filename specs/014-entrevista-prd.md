# Spec: entrevista de triagem → PRD antes dos artefatos

Status: aceito  
Fase: mock + supabase  
Fora: runtime eve (fica como evolução; o motor é nativo com as mesmas regras), pesquisa usando o PRD como briefing, entrevista para projetos antigos. TRD, fluxo, UI/UX, backend e plano de implementação estão na spec 015.

## Contexto

Depois que o usuário descreve a ideia, um analista de produto sênior (IA) o entrevista antes de qualquer outro artefato. Regras inspiradas em `grill-me` / `to-prd` (Matt Pocock) e `prd-interviewer`: uma pergunta por vez, resolvendo dependências (problema antes de solução, usuário antes de fluxo), com 2 a 4 opções concretas, a resposta recomendada marcada e o porquê. Categorias: problema, usuários, solução, escopo, negócio, UX, técnico, riscos, métricas — a IA pula as irrelevantes. Ao final gera um PRD — com recursos recomendados (skills, repositórios e serviços gratuitos) para construir o sistema —, o usuário revisa, pode editar ou pedir ajuste e só então aprova. Requisitos e telas (wireframes) nascem do PRD aprovado.

Etapas do PRD do projeto: `interview` → `review` → `approved`. Projeto sem registro de PRD (anterior a esta spec) continua liberado.

## Critérios

### AC-1 Novo projeto abre a entrevista
Dado um usuário autenticado, quando cria um projeto com nome e ideia, então o projeto existe como `draft` com PRD na etapa `interview`, sem requisitos, telas, versão nem débito de créditos.

### AC-2 Uma pergunta por vez
Dado a entrevista em andamento, quando a IA responde, então vem uma única pergunta com categoria, motivo, 2 a 4 opções e uma recomendada que é uma das opções; resposta fora do formato gera até duas novas tentativas, em que a IA recebe a resposta ruim e o motivo para corrigir; se todas falharem, erro com "Tentar de novo".

### AC-3 Contexto acumulado
Dado perguntas já respondidas, quando pede a próxima pergunta, então a IA recebe o briefing e cada par pergunta/resposta em ordem, para não repetir o que já foi respondido.

### AC-4 Responder, recomendar ou pular
Dado uma pergunta pendente, quando o usuário marca uma ou mais opções (inclusive a recomendada) e/ou escreve texto livre e responde, ou pula, então a resposta fica gravada na pergunta; pular grava "Decidir depois" e vira pergunta em aberto no PRD.
- Várias opções marcadas viram uma única resposta, como texto livre: as opções na ordem em que aparecem e, por último, o texto escrito, separados por "; ".
- Sem opção marcada nem texto, "Responder" fica desabilitado.

### AC-12 Ajustar resposta anterior
Dado a entrevista em andamento com respostas dadas, quando o usuário escolhe "Ajustar" numa resposta anterior (as opções que compunham a resposta já vêm marcadas e o restante vai para o texto livre) e grava outras opções, texto livre ou "Decidir depois", então só aquela resposta muda: as demais respostas e a pergunta pendente continuam, e a próxima pergunta e o PRD usam a resposta nova. Resposta vazia é recusada; depois que a entrevista encerra (PRD em revisão), o ajuste exige "Voltar à entrevista".

### AC-5 Fim adaptativo
Dado a entrevista, quando a IA sinaliza que tem o suficiente ou o usuário chega a 20 respostas, então a entrevista termina e o PRD é gerado; o botão "Gerar PRD agora" só libera com ao menos 3 respostas.

### AC-6 PRD estruturado
Dado o briefing e as respostas, quando gera o PRD, então o documento tem título, resumo, problema, público, objetivos, fora de escopo, funcionalidades priorizadas (P0/P1/P2) com critérios de aceite, fluxos, UX, técnico, riscos com mitigação, métricas e perguntas em aberto; sem ao menos uma funcionalidade, é recusado.

### AC-7 Revisão
Dado o PRD gerado, quando o usuário vê a revisão, então pode editar o texto, pedir ajuste (a IA refaz com o pedido) ou voltar à entrevista para mais perguntas, sem gerar outros artefatos.

### AC-8 Aprovar gera o planejamento
Dado o PRD em revisão, quando o usuário aprova, então a etapa vira `approved`, requisitos e telas são gerados a partir do PRD, surgem a versão 1 e o débito de créditos de "Criar projeto", e começa a cadeia de documentos técnicos (spec 015).

### AC-9 Fluxo bloqueado até aprovar
Dado um projeto com PRD não aprovado, quando o usuário tenta abrir telas, análise, radar, personas, banco ou export, ou salvar esses artefatos, então é levado à entrevista (UI) e o repositório recusa a gravação.

### AC-10 Persistência isolada
Dado o modo Supabase, quando grava a entrevista e o PRD, então ficam em `project_prds` com RLS pelo dono do projeto; excluir o projeto remove o PRD.

### AC-13 PRD aprovado na exportação
Dado um projeto com PRD aprovado, quando gera o pacote de exportação, então:
- `prd.md` é o PRD aprovado completo (com a edição do usuário, se houver);
- os arquivos de cada IDE (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules/implement.md`, `ANTIGRAVITY.md`) mandam ler `prd.md` e `screens.md` antes de implementar: P0 primeiro, critérios de aceite viram testes, nada do "Fora de escopo", "Perguntas em aberto" são perguntadas ao usuário antes de decidir e "Recursos recomendados" são considerados;
- `PROMPT.md` e "Copiar prompt inicial" levam as mesmas instruções com o PRD embutido (para colar em qualquer chat).
Projeto sem PRD (anterior a esta spec) mantém `prd.md` montado a partir de requisitos e telas.

### AC-11 Recursos recomendados no PRD
Dado o PRD gerado (ou refeito com ajuste), quando a IA finaliza, então o PRD traz a seção "Recursos recomendados" com até 5 skills de agente de IA, até 5 repositórios do GitHub e até 5 serviços externos que ajudem a construir o sistema proposto, cada item com link `http(s)` e o motivo; a seção é revisável e editável como o resto do PRD.
- Item sem link válido é descartado; repositório precisa de link `github.com/<dono>/<repo>`.
- A IA recebe um catálogo curado do IdeiaMap (skills, repositórios e serviços gratuitos conferidos) e o prefere.
- Só entram serviços gratuitos ou com plano gratuito permanente: serviço precisa estar no catálogo, e o nome, o link e o limite gratuito exibidos vêm do catálogo, não da IA; serviço fora do catálogo é descartado.
- Links do GitHub (repositórios e skills) são conferidos na API pública do GitHub: repositório inexistente ou arquivado sai da lista; se a verificação não responder, o item fica.
- Na visualização, os links abrem em nova aba.

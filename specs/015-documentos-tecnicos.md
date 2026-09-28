# Spec: documentos técnicos em cadeia a partir do PRD

Status: aceito  
Fase: mock + supabase  
Fora: imagem ou Figma de alta fidelidade, validar o SQL num Postgres real ou aplicar a migration, estimativa de prazo em horas, documentos para projetos sem PRD aprovado. A página **Banco** continua como proposta rápida; o esquema oficial do projeto é o do documento Backend.

## Contexto

Depois do PRD aprovado (spec 014), o analista escreve, um de cada vez, os documentos que um time precisa para construir o sistema. Cada um parte do PRD e dos documentos já aprovados, passa por revisão (editar, pedir ajuste, aprovar) e, aprovado, dispara o próximo:

1. **TRD** — documento técnico
2. **Fluxo do sistema** — mapa de navegação e jornadas
3. **UI/UX Design** — direção visual e padrões de interface
4. **Esquema backend** — dados, SQL, endpoints e regras de acesso
5. **Plano de implementação** — fases, tarefas, dependências e marcos

Cada documento fica em `draft` (revisão) ou `approved`. Tudo na página **Documentos** do projeto.

## Critérios

### AC-1 Cadeia na ordem
Dado um projeto com PRD aprovado, quando o usuário gera ou aprova um documento, então só é aceito se todos os anteriores da cadeia estiverem aprovados; o primeiro (TRD) só precisa do PRD aprovado. Projeto com PRD não aprovado ou sem PRD recusa gerar documentos.

### AC-2 Geração a partir do PRD
Dado o próximo documento da cadeia, quando a IA o escreve, então recebe o PRD aprovado, os documentos anteriores aprovados, as telas (nome, rota, descrição, componentes) e os requisitos, e devolve Markdown com estas seções obrigatórias (títulos `##`):
- TRD: Stack, Arquitetura, Integrações, Requisitos não funcionais, Segurança e privacidade, Riscos técnicos.
- Fluxo do sistema: Mapa de navegação (com diagrama Mermaid), Jornadas, Estados e erros.
- UI/UX Design: Direção visual, Cores e tipografia, Componentes, Estados da interface, Acessibilidade, Responsividade.
- Esquema backend: Modelo de dados, SQL (bloco `sql` com `create table` e RLS), Endpoints, Regras de acesso.
- Plano de implementação: Fases, Tarefas (checklist `- [ ]`), Dependências, Marcos.

O pedido à IA é de texto livre (sem modo JSON do provedor); resposta em JSON é recusada como fora do formato.
Resposta sem alguma seção, sem o diagrama (fluxo), sem o SQL (backend) ou sem tarefas (plano) gera até duas novas tentativas em que a IA recebe a resposta ruim e o que faltou; se todas falharem, erro com "Tentar de novo".
Diagrama Mermaid com erro de sintaxe: antes de salvar, o app valida o diagrama e pede à IA a correção com o erro do validador (até duas vezes); deslizes conhecidos (espaços em volta do rótulo da seta) são normalizados sem nova chamada.

### AC-3 Revisão e cadeia automática
Dado um documento em revisão, quando o usuário o vê, então pode editar o texto, pedir ajuste (a IA refaz com o pedido e o texto atual) ou aprovar; aprovar gera automaticamente o próximo da cadeia. Ao aprovar o PRD, o TRD começa a ser gerado.

### AC-4 Ajustar documento aprovado
Dado um documento aprovado, quando o usuário edita o texto ou pede ajuste, então ele volta para revisão e os documentos seguintes que estavam aprovados também voltam para revisão (o texto fica), porque podem ter ficado desatualizados. Texto vazio é recusado.

### AC-5 Visualização
Dado um documento, quando é exibido, então blocos Mermaid viram diagrama (se o diagrama for inválido, mostra o código e um aviso), tabelas Markdown viram tabela, checklists aparecem como caixas e links abrem em nova aba.

### AC-6 Exportação
Dado documentos aprovados, quando gera o pacote de exportação, então:
- entram `trd.md`, `flows.md`, `design.md`, `backend.md` e `plan.md` (só os aprovados);
- `schema.sql` traz o bloco SQL do Esquema backend;
- `wireframes/<tela>.html` traz o wireframe de cada tela;
- os arquivos das IDEs listam os documentos presentes e mandam seguir `plan.md` fase a fase, partir de `schema.sql` para o banco e respeitar `design.md` na interface;
- `PROMPT.md` embute os documentos aprovados.
Documento em revisão não entra no pacote.

### AC-8 Gerar pacote completa os documentos
Dado um projeto com PRD aprovado e documentos técnicos faltando ou em revisão, quando o usuário clica "Gerar pacote" na exportação, então:
- na ordem da cadeia, cada documento que não existe é gerado e aprovado, e cada um em revisão é aprovado como está;
- o progresso aparece ("Gerando TRD — 1 de 5");
- ao fim, o pacote é registrado e o ZIP é baixado com todos os documentos.
Se uma geração falhar, o processo para com o erro e o nome do documento, os já gerados continuam aprovados e o ZIP não é baixado. Com todos aprovados (ou projeto sem PRD), "Gerar pacote" só registra e baixa o ZIP.

### AC-7 Persistência isolada
Dado o modo Supabase, quando grava documentos, então ficam em `project_artifacts` (um por tipo e projeto) com RLS pelo dono do projeto; excluir o projeto remove os documentos; outro usuário não os lê; duplicar o projeto copia os documentos.

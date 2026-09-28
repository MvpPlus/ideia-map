import type { ChatTurn } from "@/lib/ai/openrouter";
import { askWithRepair } from "@/lib/ai/repair";
import { ARTIFACT_KINDS, ARTIFACT_META } from "@/lib/projects/artifacts";
import type { ArtifactKind, ProjectArtifact, Requirement, Screen } from "@/lib/types";

export const ARTIFACT_SECTIONS: Record<ArtifactKind, string[]> = {
  trd: ["Stack", "Arquitetura", "Integrações", "Requisitos não funcionais", "Segurança e privacidade", "Riscos técnicos"],
  flow: ["Mapa de navegação", "Jornadas", "Estados e erros"],
  design: [
    "Direção visual",
    "Cores e tipografia",
    "Componentes",
    "Estados da interface",
    "Acessibilidade",
    "Responsividade",
  ],
  backend: ["Modelo de dados", "SQL", "Endpoints", "Regras de acesso"],
  plan: ["Fases", "Tarefas", "Dependências", "Marcos"],
};

const GUIDANCE: Record<ArtifactKind, string> = {
  trd: `- Stack: framework, linguagem, banco, autenticação, hospedagem e bibliotecas principais, cada escolha com o porquê em uma linha. Prefira os recursos recomendados e os serviços gratuitos do PRD.
- Arquitetura: camadas e módulos, onde roda cada parte (cliente, servidor, jobs) e como conversam.
- Integrações: cada serviço externo, para que serve e o que acontece se cair.
- Requisitos não funcionais: metas mensuráveis de desempenho, disponibilidade, custo, privacidade (LGPD) e observabilidade.
- Segurança e privacidade: autenticação, autorização por dono, segredos só no servidor, validação de entrada, dados sensíveis.
- Riscos técnicos: risco e mitigação.`,
  flow: `- Mapa de navegação: UM bloco \`\`\`mermaid com flowchart TD ligando as telas pelas rotas reais. Regras de sintaxe: ids só com letras e números, sem acento; declare cada tela uma vez com o rótulo entre aspas duplas, ex.: catalogo["Catálogo /catalogo"]; depois UMA ligação por linha, sem encadear (nada de A --> B --> C), com o rótulo da seta colado nas barras: catalogo -->|"Fazer pedido"| pedido.
- Jornadas: uma por fluxo principal do PRD, passos numerados citando as telas.
- Estados e erros: carregando, vazio, erro, sem permissão e sem conexão nas telas críticas, e o que o usuário vê em cada um.`,
  design: `- Direção visual: tom, personalidade e referências, coerentes com o público do PRD.
- Cores e tipografia: tabela Markdown "token | valor | uso" (cores em hex com contraste AA) e escala tipográfica (famílias e tamanhos).
- Componentes: os componentes de interface reutilizáveis, variações e em quais telas aparecem.
- Estados da interface: vazio, carregando, erro, sucesso e desabilitado, com o texto de exemplo.
- Acessibilidade: contraste, foco visível, alvos de toque de 44px, rótulos para leitor de tela, navegação por teclado.
- Responsividade: breakpoints e o que muda do celular para o desktop.`,
  backend: `- Modelo de dados: entidades, campos principais e relações (1:N, N:N).
- SQL: UM bloco \`\`\`sql Postgres (Supabase) com create table public.<tabela> (id uuid primary key default gen_random_uuid(), foreign keys, índices, created_at timestamptz default now()). O dono é user_id uuid references auth.users; senha e login ficam no Supabase Auth, nunca numa tabela própria. Para cada tabela: alter table ... enable row level security; policies separadas: select/update/delete com using (auth.uid() = user_id) e insert com with check (auth.uid() = user_id); tabela filha verifica o dono pelo pai com exists.
- Endpoints: tabela Markdown "método | rota | o que faz | quem pode".
- Regras de acesso: quem lê e quem escreve cada entidade.`,
  plan: `- Fases: MVP com as funcionalidades P0 primeiro, depois P1 e P2; objetivo de cada fase.
- Tarefas: checklist "- [ ] tarefa (P/M/G)" agrupado por fase (### Fase 1…), tarefas de até um dia, cada uma citando a tela, tabela ou requisito que entrega.
- Dependências: o que bloqueia o quê.
- Marcos: entregas verificáveis com critério de pronto.`,
};

function artifactSystem(kind: ArtifactKind): string {
  const { label } = ARTIFACT_META[kind];
  return `Você é um arquiteto de software sênior do IdeiaMap. Escreva o documento "${label}" do sistema descrito no PRD aprovado, coerente com os documentos anteriores aprovados, as telas e os requisitos. Não contradiga o PRD nem inclua o que está em "Fora de escopo"; onde o PRD não decidiu, escolha a opção recomendada e diga o porquê em uma linha.
Responda APENAS em Markdown, em português, começando por "# ${label}" e com exatamente estas seções de título "##", nesta ordem: ${ARTIFACT_SECTIONS[kind].join(", ")}.
${GUIDANCE[kind]}`;
}

type ArtifactContext = {
  kind: ArtifactKind;
  prd: string;
  artifacts: Pick<ProjectArtifact, "kind" | "status" | "markdown">[];
  screens: Pick<Screen, "name" | "route" | "description" | "components">[];
  requirements: Pick<Requirement, "title" | "description" | "priority">[];
  current?: string;
  feedback?: string;
};

export function buildArtifactMessages(input: ArtifactContext): ChatTurn[] {
  const before = ARTIFACT_KINDS.slice(0, ARTIFACT_KINDS.indexOf(input.kind));
  const approvedDocs = before
    .map((kind) => input.artifacts.find((a) => a.kind === kind && a.status === "approved"))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => `=== ${ARTIFACT_META[a.kind].label} ===\n${a.markdown.trim()}`);
  const screens = input.screens.map((s) => {
    const components = s.components.map((c) => c.name).join(", ");
    return `- ${s.name} (${s.route}): ${s.description}${components ? ` — componentes: ${components}` : ""}`;
  });
  const requirements = input.requirements.map((r) => `- [${r.priority}] ${r.title}: ${r.description}`);
  const parts = [
    `PRD aprovado:\n${input.prd.trim()}`,
    `Documentos aprovados:\n${approvedDocs.join("\n\n") || "(nenhum ainda)"}`,
    `Telas:\n${screens.join("\n") || "(nenhuma)"}`,
    `Requisitos:\n${requirements.join("\n") || "(nenhum)"}`,
  ];
  if (input.current?.trim() && input.feedback?.trim()) {
    parts.push(`Documento atual:\n${input.current.trim()}`, `Ajuste pedido pelo usuário:\n${input.feedback.trim()}`);
  }
  return [
    { role: "system", content: artifactSystem(input.kind) },
    { role: "user", content: parts.join("\n\n") },
  ];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unwrap(raw: string): string {
  const text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const lines = text.split("\n");
  if (/^```(markdown|md)?\s*$/i.test(lines[0] ?? "") && /^```\s*$/.test(lines.at(-1) ?? "")) {
    return lines.slice(1, -1).join("\n").trim();
  }
  return text;
}

function fence(markdown: string, lang: string): string {
  const match = markdown.match(new RegExp("```" + lang + "[^\\n]*\\n([\\s\\S]*?)```", "i"));
  return match?.[1]?.trim() ?? "";
}

export function extractSql(markdown: string): string {
  return fence(markdown, "sql");
}

function tidyMermaid(markdown: string): string {
  return markdown.replace(/```mermaid[^\n]*\n[\s\S]*?```/gi, (block) =>
    block.replace(/\|\s*"([^"|\n]*)"\s*\|/g, '|"$1"|'),
  );
}

export function parseArtifact(kind: ArtifactKind, raw: string): string {
  const markdown = tidyMermaid(unwrap(raw));
  if (/^[{[]/.test(markdown)) throw new Error("A resposta veio em JSON; escreva o documento em Markdown.");
  const headings = [...markdown.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => normalize(m[1] ?? ""));
  const missing = ARTIFACT_SECTIONS[kind].filter(
    (section) => !headings.some((heading) => heading.includes(normalize(section))),
  );
  if (missing.length) throw new Error(`Faltaram as seções: ${missing.join(", ")}.`);
  if (kind === "flow" && !/^(flowchart|graph|sequenceDiagram|stateDiagram|journey)/i.test(fence(markdown, "mermaid"))) {
    throw new Error("O Mapa de navegação precisa de um diagrama Mermaid (bloco ```mermaid com flowchart).");
  }
  if (kind === "backend" && !/create\s+table/i.test(extractSql(markdown))) {
    throw new Error("A seção SQL precisa de um bloco ```sql com create table.");
  }
  if (kind === "plan" && !/^\s*- \[ \]/m.test(markdown)) {
    throw new Error('As tarefas precisam estar em checklist "- [ ]".');
  }
  return markdown.startsWith("# ") ? markdown : `# ${ARTIFACT_META[kind].label}\n\n${markdown}`;
}

export function generateArtifact(
  kind: ArtifactKind,
  ask: (repair: ChatTurn[]) => Promise<string>,
  tries = 3,
): Promise<string> {
  return askWithRepair({
    ask,
    parse: (raw) => parseArtifact(kind, raw),
    label: `artifact:${kind}`,
    tries,
    retryHint: `Escreva de novo o documento completo em Markdown, com todas as seções "##": ${ARTIFACT_SECTIONS[kind].join(", ")}.`,
  });
}

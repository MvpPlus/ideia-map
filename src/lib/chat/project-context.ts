import type {
  Competitor,
  DataModel,
  Persona,
  Project,
  ProjectAnalysis,
  ProjectArtifact,
  ProjectPrd,
  Requirement,
  Screen,
} from "@/lib/types";

export const DEFAULT_CHAT_CONTEXT_MAX = 12_000;

export type ProjectChatBundle = {
  project: Project;
  requirements: Requirement[];
  screens: Screen[];
  prd?: ProjectPrd;
  artifacts: Pick<ProjectArtifact, "kind" | "status" | "markdown">[];
  analysis?: ProjectAnalysis;
  competitors: Competitor[];
  personas: Persona[];
  dataModel?: DataModel;
  latestVersion?: number;
  pathname: string;
  maxChars?: number;
};

const PAGE_LABELS: { match: RegExp; label: string }[] = [
  { match: /\/interview\/?$/, label: "Entrevista e PRD" },
  { match: /\/overview\/?$/, label: "Planejar" },
  { match: /\/analysis\/?$/, label: "Análise" },
  { match: /\/competitive\/?$/, label: "Radar de mercado" },
  { match: /\/personas\/?$/, label: "Personas" },
  { match: /\/screens\/?$/, label: "Telas" },
  { match: /\/database\/?$/, label: "Banco" },
  { match: /\/docs\/?$/, label: "Documentos técnicos" },
  { match: /\/export\/?$/, label: "Exportar" },
  { match: /\/edit\/?$/, label: "Editar projeto" },
  { match: /\/projects\/[^/]+\/?$/, label: "Trilha do projeto" },
];

export function pageLabelFromPath(pathname: string): string {
  for (const row of PAGE_LABELS) {
    if (row.match.test(pathname)) return row.label;
  }
  return "Projeto";
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 20))}\n…[truncado]`;
}

function pageSlice(input: ProjectChatBundle): string {
  const label = pageLabelFromPath(input.pathname);
  const lines = [`Página atual: ${label}`];
  if (/\/interview\/?$/.test(input.pathname)) {
    const prd = input.prd;
    lines.push(`Estágio PRD/entrevista: ${prd?.stage ?? "sem PRD"}`);
    const answered = prd?.questions.filter((q) => q.answer !== null).length ?? 0;
    lines.push(`Perguntas respondidas: ${answered}/${prd?.questions.length ?? 0}`);
    if (prd?.questions.length) {
      const last = [...prd.questions].reverse().find((q) => q.answer !== null) ?? prd.questions[0];
      lines.push(`Última pergunta: ${last.question}`);
      if (last.answer) lines.push(`Resposta: ${last.answer}`);
    }
  } else if (/\/overview\/?$/.test(input.pathname)) {
    lines.push(`Requisitos na página: ${input.requirements.length}; versão ${input.latestVersion ?? 0}`);
    lines.push(...input.requirements.slice(0, 8).map((r) => `- [${r.priority}] ${r.title}: ${r.description}`));
  } else if (/\/docs\/?$/.test(input.pathname)) {
    if (!input.artifacts.length) lines.push("Nenhum documento técnico ainda.");
    for (const a of input.artifacts) {
      lines.push(`- ${a.kind.toUpperCase()} (${a.status})`);
    }
  } else if (/\/screens\/?$/.test(input.pathname)) {
    lines.push(...input.screens.map((s) => `- ${s.name} (${s.route}): ${s.description}`));
  } else if (/\/database\/?$/.test(input.pathname)) {
    const tables = input.dataModel?.tables ?? [];
    lines.push(tables.length ? `Tabelas: ${tables.map((t) => t.name).join(", ")}` : "Sem modelo de dados.");
  } else if (/\/analysis\/?$/.test(input.pathname)) {
    const findings = input.analysis?.findings ?? [];
    lines.push(findings.length ? findings.map((f) => `- ${f.title}: ${f.detail}`).join("\n") : "Sem análise ainda.");
  } else if (/\/competitive\/?$/.test(input.pathname)) {
    lines.push(
      input.competitors.length
        ? input.competitors.map((c) => `- ${c.name} (${c.url}): ${c.notes}`).join("\n")
        : "Sem concorrentes.",
    );
  } else if (/\/personas\/?$/.test(input.pathname)) {
    lines.push(
      input.personas.length
        ? input.personas.map((p) => `- ${p.name} (${p.job})`).join("\n")
        : "Sem personas.",
    );
  } else if (/\/export\/?$/.test(input.pathname)) {
    lines.push("Página de exportação do pacote para IDE.");
  } else {
    lines.push("Mapa/trilha do projeto.");
  }
  return lines.join("\n");
}

function projectSlice(input: ProjectChatBundle): string {
  const lines = [
    "Projeto:",
    `Nome: ${input.project.name}`,
    `Descrição: ${input.project.description}`,
    `Status: ${input.project.status}`,
    `Requisitos (${input.requirements.length}):`,
    ...input.requirements.slice(0, 20).map((r) => `- [${r.priority}] ${r.title}: ${r.description}`),
    `Telas (${input.screens.length}):`,
    ...input.screens.slice(0, 20).map((s) => `- ${s.name} (${s.route}): ${s.description}`),
  ];
  if (input.prd) {
    lines.push(`PRD estágio: ${input.prd.stage}`);
    if (input.prd.prd_markdown.trim()) {
      lines.push("PRD (resumo):", clip(input.prd.prd_markdown.trim(), 2500));
    }
  }
  if (input.artifacts.length) {
    lines.push("Documentos técnicos:");
    for (const a of input.artifacts) {
      lines.push(`- ${a.kind} (${a.status}): ${clip(a.markdown, 400)}`);
    }
  }
  if (input.analysis?.findings.length) {
    lines.push("Análise:", ...input.analysis.findings.slice(0, 5).map((f) => `- ${f.title}: ${f.detail}`));
  }
  if (input.personas.length) {
    lines.push("Personas:", ...input.personas.slice(0, 5).map((p) => `- ${p.name}: ${p.job}`));
  }
  if (input.dataModel?.tables.length) {
    lines.push("Banco:", ...input.dataModel.tables.map((t) => `- ${t.name} (${t.columns.map((c) => c.name).join(", ")})`));
  }
  return lines.join("\n");
}

export function buildProjectChatContext(input: ProjectChatBundle): string {
  const max = input.maxChars ?? DEFAULT_CHAT_CONTEXT_MAX;
  const text = `${pageSlice(input)}\n\n${projectSlice(input)}`;
  return clip(text, max);
}

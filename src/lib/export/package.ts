import { extractSql } from "@/lib/ai/artifacts";
import { ARTIFACT_KINDS, ARTIFACT_META } from "@/lib/projects/artifacts";
import type { ExportTarget, Project, ProjectArtifact, ProjectPrd, Requirement, Screen } from "@/lib/types";

type ExportInput = {
  project: Pick<Project, "name" | "description">;
  requirements: Pick<Requirement, "title" | "description">[];
  screens: (Pick<Screen, "name" | "route" | "description"> & Partial<Pick<Screen, "wireframe_html">>)[];
  prd: Pick<ProjectPrd, "stage" | "prd_markdown"> | undefined;
  artifacts?: Pick<ProjectArtifact, "kind" | "status" | "markdown">[];
};

type PackageInput = ExportInput & { targets: ExportTarget[] };

const TARGET_FILES: [ExportTarget, string][] = [
  ["claude-code", "CLAUDE.md"],
  ["cursor", ".cursor/rules/implement.md"],
  ["codex", "AGENTS.md"],
  ["antigravity", "ANTIGRAVITY.md"],
  ["markdown", "PROMPT.md"],
];

const RULES = [
  "- P0 primeiro, depois P1 e P2.",
  "- Cada critério de aceite (Dado / quando / então) vira teste antes do código.",
  '- Nada do que está em "Fora de escopo".',
  '- "Perguntas em aberto": pergunte ao usuário antes de decidir.',
  '- "Recursos recomendados": considere as skills, repositórios e serviços gratuitos listados antes de escolher outra coisa.',
];

const DOC_PURPOSE: Record<ProjectArtifact["kind"], string> = {
  trd: "stack, arquitetura e requisitos não funcionais",
  flow: "mapa de navegação e jornadas",
  design: "direção visual, componentes e estados",
  backend: "modelo de dados, endpoints e regras de acesso",
  plan: "fases e tarefas",
};

function approvedMarkdown(prd: ExportInput["prd"]): string | null {
  return prd?.stage === "approved" && prd.prd_markdown.trim() ? prd.prd_markdown : null;
}

function approvedDocs(input: ExportInput) {
  return ARTIFACT_KINDS.map((kind) => input.artifacts?.find((a) => a.kind === kind && a.status === "approved")).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );
}

function schemaSql(input: ExportInput): string {
  const backend = approvedDocs(input).find((a) => a.kind === "backend");
  const sql = backend ? extractSql(backend.markdown) : "";
  return sql ? `${sql}\n` : "";
}

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tela"
  );
}

function wireframeFiles(input: ExportInput): Record<string, string> {
  const files: Record<string, string> = {};
  for (const screen of input.screens) {
    if (!screen.wireframe_html?.trim()) continue;
    const base = slug(screen.name);
    let name = `wireframes/${base}.html`;
    for (let n = 2; name in files; n++) name = `wireframes/${base}-${n}.html`;
    files[name] = screen.wireframe_html;
  }
  return files;
}

function planSummary({ project, requirements, screens }: ExportInput): string {
  return `# ${project.name}\n\n${project.description}\n\nRequisitos:\n${requirements
    .map((r) => `- ${r.title}: ${r.description}`)
    .join("\n")}\n\nTelas:\n${screens.map((s) => `- ${s.name} (${s.route})`).join("\n")}\n`;
}

function prdFile(input: ExportInput): string {
  return approvedMarkdown(input.prd) ?? planSummary(input);
}

function readingList(input: ExportInput): string {
  const docs = approvedDocs(input).map((a) => `- \`${ARTIFACT_META[a.kind].file}\` — ${DOC_PURPOSE[a.kind]}`);
  if (schemaSql(input)) docs.push("- `schema.sql` — SQL do banco com RLS");
  if (Object.keys(wireframeFiles(input)).length) docs.push("- `wireframes/` — esqueleto HTML de cada tela");
  return ["- `prd.md` — fonte de verdade", "- `screens.md` — telas e rotas", ...docs].join("\n");
}

function rules(input: ExportInput): string {
  const kinds = new Set(approvedDocs(input).map((a) => a.kind));
  const extra = [
    kinds.has("plan") ? "- Siga `plan.md` fase a fase e marque cada tarefa ao concluir." : "",
    schemaSql(input) ? "- Banco: parta de `schema.sql` (tabelas, RLS e policies)." : "",
    kinds.has("design") ? "- Interface: respeite `design.md` (cores, tipografia, componentes, estados e acessibilidade)." : "",
  ].filter(Boolean);
  return [...RULES, ...extra].join("\n");
}

function idePrompt(input: ExportInput): string {
  return [
    `Implemente o produto "${input.project.name}".`,
    `Antes de codar, leia:\n${readingList(input)}`,
    rules(input),
  ].join("\n\n");
}

export function standalonePrompt(input: ExportInput): string {
  return [
    `Implemente o produto "${input.project.name}". O PRD abaixo é a fonte de verdade.`,
    rules(input),
    `---\n\n${prdFile(input)}`,
    ...approvedDocs(input).map((a) => `---\n\n${a.markdown}`),
    `---\n\nTelas:\n${input.screens.map((s) => `- ${s.name} (${s.route}): ${s.description}`).join("\n")}`,
  ].join("\n\n");
}

export function buildExportFiles(input: PackageInput): Record<string, string> {
  const files: Record<string, string> = {
    "README.md": `# ${input.project.name}\n\n${input.project.description}\n\nComece por:\n${readingList(input)}\n`,
    "prd.md": prdFile(input),
    "screens.md": input.screens.map((s) => `## ${s.name}\nRota: ${s.route}\n${s.description}\n`).join("\n"),
  };
  for (const doc of approvedDocs(input)) {
    files[ARTIFACT_META[doc.kind].file] = doc.markdown;
    if (doc.kind === "backend" && schemaSql(input)) files["schema.sql"] = schemaSql(input);
  }
  Object.assign(files, wireframeFiles(input));
  for (const [target, file] of TARGET_FILES) {
    if (!input.targets.includes(target)) continue;
    files[file] = target === "markdown" ? standalonePrompt(input) : idePrompt(input);
  }
  return files;
}

export function exportTree(input: PackageInput): string[] {
  return Object.keys(buildExportFiles(input));
}

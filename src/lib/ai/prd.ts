import { githubRepoName } from "@/lib/ai/github-verify";
import { answeredQuestions } from "@/lib/ai/interview";
import {
  REPO_CATALOG,
  SKILL_CATALOG,
  catalogPrompt,
  findCatalogEntry,
  findCatalogService,
  type CatalogEntry,
} from "@/lib/ai/resource-catalog";
import { extractJson } from "@/lib/ai/json";
import type { ChatTurn } from "@/lib/ai/openrouter";
import type { InterviewQuestion } from "@/lib/types";

export type PrdPriority = "P0" | "P1" | "P2";

export type PrdFeature = {
  name: string;
  priority: PrdPriority;
  description: string;
  acceptance: string[];
};

export type PrdResource = { name: string; url: string; why: string };
export type PrdService = PrdResource & { free_tier: string; pricing: string };
export type PrdResources = { skills: PrdResource[]; repos: PrdResource[]; services: PrdService[] };

export type PrdDocument = {
  title: string;
  summary: string;
  problem: string;
  audience: string[];
  goals: string[];
  non_goals: string[];
  features: PrdFeature[];
  flows: string[];
  ux: string;
  technical: string;
  risks: { risk: string; mitigation: string }[];
  metrics: string[];
  open_questions: string[];
  resources: PrdResources;
};

export const PRD_SYSTEM = `Você é um analista de produto sênior do IdeiaMap. Escreva o PRD a partir do briefing e da entrevista, sem inventar o que o usuário não disse: o que ficou indefinido ou "Decidir depois" vai para open_questions.
Funcionalidades priorizadas (P0 = sem isso não lança, P1 = importante, P2 = depois) e cada uma com critérios de aceite no formato "Dado / quando / então".
Em resources, recomende o que ajuda a construir ESTE sistema (até 5 de cada):
- skills: skills de agente de IA (SKILL.md para Cursor/Claude Code), com link do repositório no GitHub ou de skills.sh;
- repos: repositórios open source no GitHub (starters, bibliotecas, exemplos) com link https://github.com/<dono>/<repo>;
- services: serviços externos gratuitos, SOMENTE do catálogo abaixo. Nada pago.
Fora do catálogo, só cite skill ou repositório do GitHub que você tem certeza que existe e é mantido; link inventado é descartado. "why" liga o recurso a uma funcionalidade ou risco do PRD. Recomende só o que serve a este sistema.
${catalogPrompt()}
Responda APENAS JSON, em português, sem markdown:
{"title":"","summary":"","problem":"","audience":[""],"goals":[""],"non_goals":[""],"features":[{"name":"","priority":"P0","description":"","acceptance":[""]}],"flows":[""],"ux":"","technical":"","risks":[{"risk":"","mitigation":""}],"metrics":[""],"open_questions":[""],"resources":{"skills":[{"name":"","url":"","why":""}],"repos":[{"name":"","url":"","why":""}],"services":[{"name":"","url":"","why":""}]}}`;

const PRIORITIES = new Set(["P0", "P1", "P2"]);
const MAX_RESOURCES = 5;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function httpUrl(value: unknown): string {
  const url = text(value);
  try {
    return /^https?:$/.test(new URL(url).protocol) ? url : "";
  } catch {
    return "";
  }
}

function resourceList<T extends PrdResource>(
  value: unknown,
  accept: (item: PrdResource) => T | null = (item) => item as T,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    const r = (item ?? {}) as Record<string, unknown>;
    const candidate = { name: text(r.name), url: httpUrl(r.url), why: text(r.why) };
    const accepted = candidate.name && candidate.url ? accept(candidate) : null;
    const key = accepted?.url.toLowerCase().replace(/\/+$/, "");
    if (!accepted || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(accepted);
    if (result.length === MAX_RESOURCES) break;
  }
  return result;
}

function fromCatalog(item: PrdResource): PrdService | null {
  const known = findCatalogService(item.url);
  return known
    ? { name: known.name, url: known.url, why: item.why, free_tier: known.free_tier, pricing: known.pricing }
    : null;
}

function catalogName(entries: CatalogEntry[]) {
  return (item: PrdResource): PrdResource => {
    const known = findCatalogEntry(entries, item.url);
    return known ? { ...item, name: known.name, url: known.url } : item;
  };
}

function parseResources(value: unknown): PrdResources {
  const data = (value ?? {}) as Record<string, unknown>;
  const repoName = catalogName(REPO_CATALOG);
  return {
    skills: resourceList(data.skills, catalogName(SKILL_CATALOG)),
    repos: resourceList(data.repos, (r) => (githubRepoName(r.url) ? repoName(r) : null)),
    services: resourceList(data.services, fromCatalog),
  };
}

export function parsePrd(raw: string): PrdDocument {
  const data = extractJson(raw) as Record<string, unknown>;
  const features = (Array.isArray(data.features) ? data.features : [])
    .map((item) => {
      const f = item as Record<string, unknown>;
      const priority = text(f.priority).toUpperCase();
      return {
        name: text(f.name),
        priority: (PRIORITIES.has(priority) ? priority : "P1") as PrdPriority,
        description: text(f.description),
        acceptance: list(f.acceptance),
      };
    })
    .filter((f) => f.name);
  if (!features.length) throw new Error("O PRD precisa de ao menos uma funcionalidade.");
  const risks = (Array.isArray(data.risks) ? data.risks : [])
    .map((item) => {
      const r = item as Record<string, unknown>;
      return { risk: text(r.risk), mitigation: text(r.mitigation) };
    })
    .filter((r) => r.risk);
  return {
    title: text(data.title) || "PRD",
    summary: text(data.summary),
    problem: text(data.problem),
    audience: list(data.audience),
    goals: list(data.goals),
    non_goals: list(data.non_goals),
    features,
    flows: list(data.flows),
    ux: text(data.ux),
    technical: text(data.technical),
    risks,
    metrics: list(data.metrics),
    open_questions: list(data.open_questions),
    resources: parseResources(data.resources),
  };
}

function link({ name, url }: PrdResource): string {
  const safeUrl = url.replace(/[()\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
  return `[${name.replace(/[[\]]/g, "")}](${safeUrl})`;
}

function resourceBullets<T extends PrdResource>(items: T[], extra: (item: T) => string = () => ""): string {
  return items.length
    ? items.map((item) => `- ${link(item)}${item.why ? ` — ${item.why}` : ""}${extra(item)}`).join("\n")
    : "- (nenhum sugerido)";
}

function resourcesSection({ skills, repos, services }: PrdResources): string {
  const tier = (item: PrdService) =>
    ` · Grátis: ${item.free_tier} (${link({ name: "ver preços", url: item.pricing, why: "" })})`;
  return [
    "## Recursos recomendados",
    `### Skills\n${resourceBullets(skills)}`,
    `### Repositórios no GitHub\n${resourceBullets(repos)}`,
    `### Serviços gratuitos\n${resourceBullets(services, tier)}`,
  ].join("\n");
}

function bullets(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- (não definido)";
}

function paragraph(value: string): string {
  return value || "(não definido)";
}

export function prdToMarkdown(doc: PrdDocument): string {
  const features = doc.features
    .map((f) => {
      const acceptance = f.acceptance.length
        ? f.acceptance.map((a) => `  - ${a}`).join("\n")
        : "  - (sem critério)";
      return `### [${f.priority}] ${f.name}\n${f.description}\n\nCritérios de aceite:\n${acceptance}`;
    })
    .join("\n\n");
  const risks = doc.risks.length
    ? doc.risks.map((r) => `- **${r.risk}** — mitigação: ${r.mitigation || "(definir)"}`).join("\n")
    : "- (não definido)";
  return [
    `# ${doc.title}`,
    `## Resumo\n${paragraph(doc.summary)}`,
    `## Problema\n${paragraph(doc.problem)}`,
    `## Público\n${bullets(doc.audience)}`,
    `## Objetivos\n${bullets(doc.goals)}`,
    `## Fora de escopo\n${bullets(doc.non_goals)}`,
    `## Funcionalidades\n${features}`,
    `## Fluxos principais\n${bullets(doc.flows)}`,
    `## Experiência e design\n${paragraph(doc.ux)}`,
    `## Considerações técnicas\n${paragraph(doc.technical)}`,
    `## Riscos e mitigações\n${risks}`,
    `## Métricas de sucesso\n${bullets(doc.metrics)}`,
    resourcesSection(doc.resources),
    `## Perguntas em aberto\n${bullets(doc.open_questions)}`,
  ].join("\n\n");
}

export function buildPrdMessages(input: {
  briefing: string;
  questions: InterviewQuestion[];
  currentPrd?: string;
  feedback?: string;
}): ChatTurn[] {
  const interview = answeredQuestions(input.questions)
    .map((q, index) => `${index + 1}. ${q.question}\nResposta: ${q.answer}`)
    .join("\n\n");
  const parts = [`Briefing:\n${input.briefing}`, `Entrevista:\n${interview || "(sem respostas)"}`];
  if (input.currentPrd?.trim() && input.feedback?.trim()) {
    parts.push(`PRD atual:\n${input.currentPrd.trim()}`, `Ajuste pedido pelo usuário:\n${input.feedback.trim()}`);
  }
  return [
    { role: "system", content: PRD_SYSTEM },
    { role: "user", content: parts.join("\n\n") },
  ];
}

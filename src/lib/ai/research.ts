import { extractJson } from "@/lib/ai/openrouter";
import type { AnalysisFinding, DataTable } from "@/lib/types";

export type ResearchKind = "analysis" | "competitive" | "personas" | "database";

export type ParsedAnalysis = { findings: AnalysisFinding[] };
export type ParsedCompetitive = { competitors: { name: string; url: string; notes: string }[] };
export type ParsedPersonas = { personas: { name: string; job: string; stories: string[]; acceptance: string[] }[] };
export type ParsedDatabase = { tables: DataTable[]; notes: string };
export type ParsedWebFill = ParsedAnalysis & ParsedCompetitive;

export const WEB_FILL_SYSTEM = `Você sintetiza busca na web para um app. Responda APENAS JSON:
{"findings":[{"title":"","detail":""}],"competitors":[{"name":"","url":"","notes":""}]}
Pelo menos 2 descobertas e 2 alternativas de mercado em português. Sem markdown.`;

export function parseWebFill(text: string): ParsedWebFill {
  return { ...parseAnalysis(text), ...parseCompetitive(text) };
}

export const RESEARCH_SYSTEM: Record<ResearchKind, string> = {
  analysis: `Você analisa um produto a partir do briefing e do texto de uma URL. Responda APENAS JSON:
{"findings":[{"title":"","detail":""}]}
Pelo menos 2 descobertas em português. Sem markdown.`,
  competitive: `Você monta pesquisa competitiva. Responda APENAS JSON:
{"competitors":[{"name":"","url":"","notes":""}]}
Pelo menos 2 concorrentes. Sem markdown.`,
  personas: `Você define personas e histórias. Responda APENAS JSON:
{"personas":[{"name":"","job":"","stories":[""],"acceptance":[""]}]}
Pelo menos 2 personas. Sem markdown.`,
  database: `Você propõe schema Postgres com RLS. Responda APENAS JSON:
{"tables":[{"name":"","columns":[{"name":"","type":"","pk":false}],"rls":""}],"notes":""}
Pelo menos 2 tabelas. Sem markdown.`,
};

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

export function parseAnalysis(text: string): ParsedAnalysis {
  const data = extractJson(text) as Record<string, unknown>;
  const findings = Array.isArray(data.findings)
    ? data.findings.map((raw) => {
        const item = raw as Record<string, unknown>;
        return {
          title: String(item.title ?? "").trim() || "Descoberta",
          detail: String(item.detail ?? "").trim(),
        };
      })
    : [];
  if (findings.length < 1) throw new Error("A análise precisa de ao menos uma descoberta.");
  return { findings };
}

export function parseCompetitive(text: string): ParsedCompetitive {
  const data = extractJson(text) as Record<string, unknown>;
  const competitors = Array.isArray(data.competitors)
    ? data.competitors.map((raw) => {
        const item = raw as Record<string, unknown>;
        return {
          name: String(item.name ?? "").trim() || "Concorrente",
          url: String(item.url ?? "").trim(),
          notes: String(item.notes ?? "").trim(),
        };
      })
    : [];
  if (competitors.length < 1) throw new Error("Informe ao menos um concorrente.");
  return { competitors };
}

export function parsePersonas(text: string): ParsedPersonas {
  const data = extractJson(text) as Record<string, unknown>;
  const personas = Array.isArray(data.personas)
    ? data.personas.map((raw) => {
        const item = raw as Record<string, unknown>;
        return {
          name: String(item.name ?? "").trim() || "Persona",
          job: String(item.job ?? "").trim(),
          stories: asStringList(item.stories),
          acceptance: asStringList(item.acceptance),
        };
      })
    : [];
  if (personas.length < 1) throw new Error("Informe ao menos uma persona.");
  return { personas };
}

export function parseDatabase(text: string): ParsedDatabase {
  const data = extractJson(text) as Record<string, unknown>;
  const tables = Array.isArray(data.tables)
    ? data.tables.map((raw) => {
        const item = raw as Record<string, unknown>;
        const columns = Array.isArray(item.columns)
          ? item.columns.map((col) => {
              const c = col as Record<string, unknown>;
              return {
                name: String(c.name ?? "").trim() || "coluna",
                type: String(c.type ?? "text").trim() || "text",
                pk: Boolean(c.pk),
              };
            })
          : [];
        return {
          name: String(item.name ?? "").trim() || "tabela",
          columns,
          rls: String(item.rls ?? "").trim(),
        };
      })
    : [];
  if (tables.length < 1) throw new Error("O modelo precisa de ao menos uma tabela.");
  return { tables, notes: String(data.notes ?? "").trim() };
}

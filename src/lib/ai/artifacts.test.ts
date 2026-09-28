import {
  ARTIFACT_SECTIONS,
  buildArtifactMessages,
  extractSql,
  generateArtifact,
  parseArtifact,
} from "@/lib/ai/artifacts";
import type { ChatTurn } from "@/lib/ai/openrouter";
import type { ArtifactKind, ProjectArtifact } from "@/lib/types";
import { describe, expect, it } from "vitest";

const MERMAID = "```mermaid\nflowchart TD\n  inicio[\"Início\"] --> catalogo[\"Catálogo\"]\n```";
const SQL = "```sql\ncreate table public.mudas (id uuid primary key);\nalter table public.mudas enable row level security;\n```";

function sample(kind: ArtifactKind): string {
  const extra: Partial<Record<ArtifactKind, Record<string, string>>> = {
    flow: { "Mapa de navegação": MERMAID },
    backend: { SQL },
    plan: { Tarefas: "### Fase 1\n- [ ] Criar tabela de mudas (P)" },
  };
  return [
    "# Documento",
    ...ARTIFACT_SECTIONS[kind].map((section) => `## ${section}\n${extra[kind]?.[section] ?? "Conteúdo."}`),
  ].join("\n\n");
}

function doc(kind: ArtifactKind, status: ProjectArtifact["status"], markdown = `# ${kind} aprovado`): ProjectArtifact {
  return { id: kind, project_id: "p", kind, markdown, status, approved_at: null, updated_at: "" };
}

const context = {
  prd: "# Horta Viva\n## Funcionalidades\n### [P0] Catálogo de mudas",
  screens: [{ name: "Catálogo", route: "/catalogo", description: "Lista de mudas", components: [{ name: "Lista", actions: ["Filtrar"] }] }],
  requirements: [{ title: "Catálogo de mudas", description: "Lista para troca", priority: "alta" as const }],
};

describe("specs/015-documentos-tecnicos", () => {
  it("AC-2 Documento com todas as seções é aceito", () => {
    for (const kind of ["trd", "flow", "design", "backend", "plan"] as const) {
      expect(parseArtifact(kind, sample(kind))).toContain(`## ${ARTIFACT_SECTIONS[kind][0]}`);
    }
  });

  it("AC-2 Seção faltando é recusada com o nome da seção", () => {
    const withoutRisks = sample("trd").replace("## Riscos técnicos", "## Outra coisa");
    expect(() => parseArtifact("trd", withoutRisks)).toThrow(/Riscos técnicos/);
  });

  it("AC-2 Títulos com acento, numeração ou complemento contam como a seção", () => {
    const loose = sample("trd").replace("## Stack", "## 1. stack e bibliotecas").replace("## Integrações", "## INTEGRACOES");
    expect(() => parseArtifact("trd", loose)).not.toThrow();
  });

  it("AC-2 Fluxo sem diagrama Mermaid é recusado", () => {
    expect(() => parseArtifact("flow", sample("flow").replace(MERMAID, "Início leva ao catálogo."))).toThrow(/Mermaid/);
  });

  it("AC-2 Rótulo de seta com espaços em volta das aspas é normalizado no diagrama", () => {
    const loose = sample("flow").replace(
      MERMAID,
      '```mermaid\nflowchart TD\n  inicio["Início"] -->| "Ver pedidos" | pedidos["Pedidos"]\n```',
    );
    expect(parseArtifact("flow", loose)).toContain('inicio["Início"] -->|"Ver pedidos"| pedidos["Pedidos"]');
  });

  it("AC-2 Backend sem SQL com create table é recusado", () => {
    expect(() => parseArtifact("backend", sample("backend").replace(SQL, "Tabela de mudas."))).toThrow(/SQL/);
  });

  it("AC-2 Plano sem checklist de tarefas é recusado", () => {
    expect(() => parseArtifact("plan", sample("plan").replace("- [ ] Criar", "Criar"))).toThrow(/- \[ \]/);
  });

  it("AC-2 Resposta em JSON é recusada pedindo Markdown", () => {
    expect(() => parseArtifact("plan", '{"error":"Invalid request"}')).toThrow(/JSON.*Markdown/);
  });

  it("AC-2 Remove o invólucro ```markdown e o raciocínio <think>", () => {
    const wrapped = `<think>pensando…</think>\n\`\`\`markdown\n${sample("trd")}\n\`\`\``;
    const result = parseArtifact("trd", wrapped);
    expect(result.startsWith("# Documento")).toBe(true);
    expect(result).not.toMatch(/think|```markdown/);
  });

  it("AC-2 A IA recebe PRD, documentos anteriores aprovados, telas e requisitos", () => {
    const [system, user] = buildArtifactMessages({
      kind: "design",
      ...context,
      artifacts: [doc("trd", "approved", "# TRD com Next.js"), doc("flow", "approved", "# Fluxo aprovado"), doc("plan", "draft", "# Plano rascunho")],
    });
    expect(system?.content).toMatch(/UI\/UX Design/);
    for (const section of ARTIFACT_SECTIONS.design) expect(system?.content).toContain(section);
    expect(user?.content).toContain("[P0] Catálogo de mudas");
    expect(user?.content).toContain("TRD com Next.js");
    expect(user?.content).toContain("Fluxo aprovado");
    expect(user?.content).not.toContain("Plano rascunho");
    expect(user?.content).toContain("Catálogo (/catalogo)");
    expect(user?.content).toContain("Lista");
    expect(user?.content).toContain("Catálogo de mudas: Lista para troca");
  });

  it("AC-2 Documento posterior na cadeia não entra no contexto", () => {
    const [, user] = buildArtifactMessages({ kind: "trd", ...context, artifacts: [doc("flow", "approved", "# Fluxo")] });
    expect(user?.content).not.toContain("# Fluxo");
  });

  it("AC-3 Pedir ajuste manda o texto atual e o pedido", () => {
    const [, user] = buildArtifactMessages({
      kind: "trd",
      ...context,
      artifacts: [],
      current: "# TRD atual com Firebase",
      feedback: "troque Firebase por Supabase",
    });
    expect(user?.content).toContain("TRD atual com Firebase");
    expect(user?.content).toContain("troque Firebase por Supabase");
  });

  it("AC-2 Fora do formato tenta de novo com a resposta ruim e o que faltou", async () => {
    const calls: ChatTurn[][] = [];
    const replies = ["# Só título", sample("trd")];
    const result = await generateArtifact("trd", async (repair) => {
      calls.push(repair);
      return replies.shift() ?? "";
    });
    expect(result).toContain("## Stack");
    expect(calls[0]).toEqual([]);
    expect(calls[1]?.[0]).toEqual({ role: "assistant", content: "# Só título" });
    expect(calls[1]?.[1]?.content).toMatch(/Riscos técnicos/);
  });

  it("AC-2 Três respostas fora do formato viram erro", async () => {
    let count = 0;
    await expect(
      generateArtifact("trd", async () => {
        count++;
        return "# Nada";
      }),
    ).rejects.toThrow(/seções/);
    expect(count).toBe(3);
  });

  it("AC-6 Extrai o bloco SQL do esquema backend", () => {
    expect(extractSql(sample("backend"))).toBe(
      "create table public.mudas (id uuid primary key);\nalter table public.mudas enable row level security;",
    );
    expect(extractSql("# Sem SQL")).toBe("");
  });
});

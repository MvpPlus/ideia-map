import { buildProjectChatContext, pageLabelFromPath } from "@/lib/chat/project-context";
import { describe, expect, it } from "vitest";

const base = {
  project: {
    id: "p1",
    user_id: "u1",
    name: "CafeApp",
    description: "Fila do café",
    status: "draft" as const,
    is_archived: false,
    updated_at: "2026-01-01",
  },
  requirements: [{ id: "r1", project_id: "p1", title: "Pedido", description: "Fazer pedido", priority: "alta" as const }],
  screens: [
    {
      id: "s1",
      project_id: "p1",
      name: "Home",
      route: "/",
      description: "Início",
      wireframe_html: "",
      components: [],
    },
  ],
  prd: {
    id: "prd1",
    project_id: "p1",
    stage: "approved" as const,
    prd_markdown: "# PRD\n\nFila digital.",
    questions: [],
    approved_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  artifacts: [
    { kind: "trd" as const, status: "approved" as const, markdown: "## Stack\nok" },
  ],
  analysis: undefined,
  competitors: [],
  personas: [],
  dataModel: undefined,
  latestVersion: 1,
};

describe("specs/019-chat-flutuante-projeto AC-2", () => {
  it("AC-2 Contexto projeto + página (docs)", () => {
    const text = buildProjectChatContext({
      ...base,
      pathname: "/projects/p1/docs",
    });
    expect(pageLabelFromPath("/projects/p1/docs")).toBe("Documentos técnicos");
    expect(text).toContain("Página atual: Documentos técnicos");
    expect(text).toContain("TRD");
    expect(text).toContain("CafeApp");
    expect(text).toContain("Pedido");
    expect(text).toContain("Home");
  });

  it("AC-2 página interview destaca entrevista", () => {
    const text = buildProjectChatContext({
      ...base,
      pathname: "/projects/p1/interview",
      prd: { ...base.prd, stage: "interview", prd_markdown: "", approved_at: null, questions: [] },
    });
    expect(text).toContain("Página atual: Entrevista e PRD");
    expect(text).toMatch(/entrevista|PRD|stage/i);
  });

  it("respeita teto de caracteres", () => {
    const long = "x".repeat(50_000);
    const text = buildProjectChatContext({
      ...base,
      pathname: "/projects/p1/overview",
      project: { ...base.project, description: long },
      maxChars: 2000,
    });
    expect(text.length).toBeLessThanOrEqual(2000);
  });
});

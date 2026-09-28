import type { GeneratedPlan } from "@/lib/ai/openrouter";
import { MockAdapter } from "@/lib/data/mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";

const plan: GeneratedPlan = {
  requirements: [{ title: "Catálogo de mudas", description: "Lista para troca", priority: "alta" }],
  screens: [{ name: "Catálogo", route: "/catalogo", description: "Lista", components: [] }],
};

function start({ approve = true } = {}) {
  const adapter = new MockAdapter();
  const { user } = adapter.login("marina@estudio.dev", "mapa");
  const project = adapter.startProjectInterview(user.id, { name: "Horta Viva", description: "Troca de mudas" });
  adapter.savePrdDraft(project.id, "# Horta Viva");
  if (approve) adapter.approvePrd(project.id, plan);
  return { adapter, project };
}

function statuses(adapter: MockAdapter, projectId: string) {
  return Object.fromEntries(adapter.listArtifacts(projectId).map((a) => [a.kind, a.status]));
}

beforeEach(() => {
  localStorage.clear();
});

describe("specs/015-documentos-tecnicos", () => {
  it("AC-1 Documento só com PRD aprovado", () => {
    const { adapter, project } = start({ approve: false });
    expect(() => adapter.saveArtifactDraft(project.id, "trd", "# TRD")).toThrow(/PRD/);
  });

  it("AC-1 Projeto sem PRD recusa documentos", () => {
    const adapter = new MockAdapter();
    adapter.login("marina@estudio.dev", "mapa");
    expect(() => adapter.saveArtifactDraft("proj_cafe", "trd", "# TRD")).toThrow(/PRD/);
  });

  it("AC-3 TRD gerado fica em revisão e aprovar libera o próximo", () => {
    const { adapter, project } = start();
    const trd = adapter.saveArtifactDraft(project.id, "trd", "# TRD");
    expect(trd.status).toBe("draft");
    expect(() => adapter.saveArtifactDraft(project.id, "flow", "# Fluxo")).toThrow(/TRD/);
    const approved = adapter.approveArtifact(project.id, "trd");
    expect(approved.status).toBe("approved");
    expect(approved.approved_at).toBeTruthy();
    expect(adapter.saveArtifactDraft(project.id, "flow", "# Fluxo").status).toBe("draft");
  });

  it("AC-1 Não aprova sem os anteriores aprovados nem documento inexistente", () => {
    const { adapter, project } = start();
    expect(() => adapter.approveArtifact(project.id, "trd")).toThrow(/gere/i);
    adapter.saveArtifactDraft(project.id, "trd", "# TRD");
    expect(() => adapter.approveArtifact(project.id, "flow")).toThrow(/TRD/);
  });

  it("AC-4 Texto vazio é recusado", () => {
    const { adapter, project } = start();
    expect(() => adapter.saveArtifactDraft(project.id, "trd", "  ")).toThrow(/vazio/i);
  });

  it("AC-4 Ajustar documento aprovado devolve ele e os seguintes para revisão", () => {
    const { adapter, project } = start();
    for (const kind of ["trd", "flow", "design"] as const) {
      adapter.saveArtifactDraft(project.id, kind, `# ${kind}`);
      adapter.approveArtifact(project.id, kind);
    }
    const flow = adapter.saveArtifactDraft(project.id, "flow", "# Fluxo ajustado");
    expect(flow.markdown).toBe("# Fluxo ajustado");
    expect(statuses(adapter, project.id)).toEqual({ trd: "approved", flow: "draft", design: "draft" });
    expect(adapter.listArtifacts(project.id).find((a) => a.kind === "design")?.markdown).toBe("# design");
  });

  it("AC-1 Lista na ordem da cadeia", () => {
    const { adapter, project } = start();
    adapter.saveArtifactDraft(project.id, "trd", "# TRD");
    adapter.approveArtifact(project.id, "trd");
    adapter.saveArtifactDraft(project.id, "flow", "# Fluxo");
    expect(adapter.listArtifacts(project.id).map((a) => a.kind)).toEqual(["trd", "flow"]);
  });

  it("AC-7 Excluir projeto remove os documentos", () => {
    const { adapter, project } = start();
    adapter.saveArtifactDraft(project.id, "trd", "# TRD");
    adapter.deleteProject(project.id);
    expect(adapter.getDb().project_artifacts.some((a) => a.project_id === project.id)).toBe(false);
  });

  it("AC-7 Duplicar projeto copia os documentos", () => {
    const { adapter, project } = start();
    adapter.saveArtifactDraft(project.id, "trd", "# TRD");
    const copy = adapter.duplicateProject(project.id);
    expect(adapter.listArtifacts(copy.id).map((a) => a.markdown)).toEqual(["# TRD"]);
  });

  it("AC-7 Outro usuário não lê nem grava os documentos", () => {
    const { adapter, project } = start();
    adapter.saveArtifactDraft(project.id, "trd", "# TRD");
    adapter.login("outra@studio.dev", "mapa");
    expect(() => adapter.listArtifacts(project.id)).toThrow(/acesso/i);
    expect(() => adapter.saveArtifactDraft(project.id, "trd", "# Invasão")).toThrow(/acesso/i);
  });
});

import type { GeneratedPlan } from "@/lib/ai/openrouter";
import { MockAdapter } from "@/lib/data/mock-adapter";
import { isProjectLocked } from "@/lib/projects/prd-gate";
import { beforeEach, describe, expect, it } from "vitest";

const plan: GeneratedPlan = {
  requirements: [{ title: "Catálogo semanal", description: "Feirante publica itens", priority: "alta" }],
  screens: [
    { name: "Catálogo", route: "/catalogo", description: "Lista", components: [{ name: "Lista", actions: ["abrir"] }] },
    { name: "Pedido", route: "/pedido", description: "Reserva", components: [] },
  ],
};

const draft = {
  category: "problema" as const,
  question: "Qual dor principal?",
  why: "Define o foco",
  options: ["Atraso", "Custo"],
  recommended: "Atraso",
};

function start() {
  const adapter = new MockAdapter();
  const { user } = adapter.login("marina@estudio.dev", "mapa");
  const project = adapter.startProjectInterview(user.id, { name: "Rota da Feira", description: "Pedidos da semana" });
  return { adapter, user, project };
}

beforeEach(() => {
  localStorage.clear();
});

describe("specs/014-entrevista-prd", () => {
  it("AC-1 Novo projeto abre a entrevista sem artefatos", () => {
    const { adapter, user, project } = start();
    expect(project.status).toBe("draft");
    expect(adapter.getProjectPrd(project.id)?.stage).toBe("interview");
    expect(adapter.listRequirements(project.id)).toHaveLength(0);
    expect(adapter.listScreens(project.id)).toHaveLength(0);
    expect(adapter.latestVersionNumber(project.id)).toBe(0);
    const credits = adapter.getDb().credit_transactions.filter((t) => t.user_id === user.id && t.operation === "Criar projeto");
    expect(credits).toHaveLength(0);
  });

  it("AC-4 Resposta gravada na pergunta", () => {
    const { adapter, project } = start();
    const q = adapter.addInterviewQuestion(project.id, draft);
    expect(q.answer).toBeNull();
    const prd = adapter.answerInterviewQuestion(project.id, q.id, "Atraso nos pedidos");
    expect(prd.questions[0]?.answer).toBe("Atraso nos pedidos");
  });

  it("AC-2 Só uma pergunta pendente por vez", () => {
    const { adapter, project } = start();
    adapter.addInterviewQuestion(project.id, draft);
    expect(() => adapter.addInterviewQuestion(project.id, draft)).toThrow(/pendente/i);
  });

  it("AC-4 Resposta vazia é recusada", () => {
    const { adapter, project } = start();
    const q = adapter.addInterviewQuestion(project.id, draft);
    expect(() => adapter.answerInterviewQuestion(project.id, q.id, "  ")).toThrow(/resposta/i);
  });

  it("AC-12 Ajustar resposta anterior mantém as demais e a pendente", () => {
    const { adapter, project } = start();
    const q1 = adapter.addInterviewQuestion(project.id, draft);
    adapter.answerInterviewQuestion(project.id, q1.id, "Atraso");
    const q2 = adapter.addInterviewQuestion(project.id, { ...draft, question: "Quem usa?" });
    adapter.answerInterviewQuestion(project.id, q2.id, "Feirante");
    adapter.addInterviewQuestion(project.id, { ...draft, question: "Como paga?" });

    const prd = adapter.answerInterviewQuestion(project.id, q1.id, "Custo alto");

    expect(prd.questions.map((q) => q.answer)).toEqual(["Custo alto", "Feirante", null]);
  });

  it("AC-12 Ajuste com resposta vazia é recusado", () => {
    const { adapter, project } = start();
    const q1 = adapter.addInterviewQuestion(project.id, draft);
    adapter.answerInterviewQuestion(project.id, q1.id, "Atraso");
    expect(() => adapter.answerInterviewQuestion(project.id, q1.id, " ")).toThrow(/resposta/i);
    expect(adapter.getProjectPrd(project.id)?.questions[0]?.answer).toBe("Atraso");
  });

  it("AC-12 Com o PRD em revisão, ajustar exige voltar à entrevista", () => {
    const { adapter, project } = start();
    const q1 = adapter.addInterviewQuestion(project.id, draft);
    adapter.answerInterviewQuestion(project.id, q1.id, "Atraso");
    adapter.savePrdDraft(project.id, "# PRD");
    expect(() => adapter.answerInterviewQuestion(project.id, q1.id, "Custo")).toThrow(/encerrada/i);
    adapter.reopenInterview(project.id);
    expect(adapter.answerInterviewQuestion(project.id, q1.id, "Custo").questions[0]?.answer).toBe("Custo");
  });

  it("AC-7 PRD em revisão e voltar à entrevista", () => {
    const { adapter, project } = start();
    const prd = adapter.savePrdDraft(project.id, "# Rota da Feira");
    expect(prd.stage).toBe("review");
    expect(prd.prd_markdown).toBe("# Rota da Feira");
    expect(adapter.listRequirements(project.id)).toHaveLength(0);
    expect(adapter.reopenInterview(project.id).stage).toBe("interview");
  });

  it("AC-8 Aprovar gera requisitos, telas, versão 1 e créditos", () => {
    const { adapter, user, project } = start();
    adapter.savePrdDraft(project.id, "# Rota da Feira");
    adapter.approvePrd(project.id, plan);
    const prd = adapter.getProjectPrd(project.id);
    expect(prd?.stage).toBe("approved");
    expect(prd?.approved_at).toBeTruthy();
    expect(adapter.listRequirements(project.id)[0]?.title).toBe("Catálogo semanal");
    expect(adapter.listScreens(project.id)).toHaveLength(2);
    expect(adapter.latestVersionNumber(project.id)).toBe(1);
    const credits = adapter.getDb().credit_transactions.filter((t) => t.user_id === user.id && t.operation === "Criar projeto");
    expect(credits[0]?.credits).toBe(25);
  });

  it("AC-8 Só aprova PRD em revisão", () => {
    const { adapter, project } = start();
    expect(() => adapter.approvePrd(project.id, plan)).toThrow(/revis/i);
  });

  it("AC-9 Bloqueio até aprovar", () => {
    const { adapter, project } = start();
    expect(isProjectLocked(adapter.getProjectPrd(project.id))).toBe(true);
    expect(isProjectLocked(undefined)).toBe(false);
    expect(() => adapter.saveAnalysis(project.id, [{ title: "x", detail: "y" }])).toThrow(/PRD/);
    expect(() => adapter.createScreen(project.id, { name: "X", route: "/x", description: "" })).toThrow(/PRD/);
    expect(() => adapter.generateExport(project.id, ["cursor"])).toThrow(/PRD/);
    adapter.savePrdDraft(project.id, "# PRD");
    adapter.approvePrd(project.id, plan);
    expect(isProjectLocked(adapter.getProjectPrd(project.id))).toBe(false);
    expect(adapter.saveAnalysis(project.id, [{ title: "x", detail: "y" }]).findings).toHaveLength(1);
  });

  it("AC-9 Projeto antigo sem PRD continua liberado", () => {
    const adapter = new MockAdapter();
    adapter.login("marina@estudio.dev", "mapa");
    expect(adapter.getProjectPrd("proj_cafe")).toBeUndefined();
    expect(adapter.saveAnalysis("proj_cafe", [{ title: "x", detail: "y" }]).findings).toHaveLength(1);
  });

  it("AC-10 Excluir projeto remove o PRD", () => {
    const { adapter, project } = start();
    adapter.deleteProject(project.id);
    expect(adapter.getDb().project_prds.some((p) => p.project_id === project.id)).toBe(false);
  });

  it("AC-10 Outro usuário não lê a entrevista", () => {
    const { adapter, project } = start();
    adapter.login("outra@studio.dev", "mapa");
    expect(() => adapter.getProjectPrd(project.id)).toThrow(/acesso/i);
  });
});

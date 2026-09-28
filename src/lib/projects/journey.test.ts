import { openWhileLocked, projectJourney, type JourneyInput } from "@/lib/projects/journey";
import type { InterviewQuestion, ProjectArtifact, ProjectPrd } from "@/lib/types";
import { describe, expect, it } from "vitest";

function question(answer: string | null): InterviewQuestion {
  return { id: "q", category: "problema", question: "?", why: "", options: [], recommended: "", answer };
}

function prd(stage: ProjectPrd["stage"], answered = 0): ProjectPrd {
  return {
    id: "prd",
    project_id: "p",
    stage,
    questions: [...Array.from({ length: answered }, () => question("sim")), question(null)],
    prd_markdown: stage === "interview" ? "" : "# PRD",
    approved_at: stage === "approved" ? "2026-09-28" : null,
    updated_at: "",
  };
}

function artifact(status: ProjectArtifact["status"]): Pick<ProjectArtifact, "status"> {
  return { status };
}

const empty: JourneyInput = {
  prd: prd("approved"),
  requirements: [],
  latestVersion: 1,
  analysis: undefined,
  competitors: [],
  personas: [],
  screens: [],
  dataModel: undefined,
  artifacts: [],
  exports: [],
};

function step(input: Partial<JourneyInput>, id: string) {
  return projectJourney({ ...empty, ...input }).steps.find((s) => s.id === id)!;
}

describe("specs/016-trilha-projeto", () => {
  it("AC-1 Trilha tem as 7 etapas na ordem, numeradas, cada uma com sua tela", () => {
    const { steps } = projectJourney(empty);
    expect(steps.map((s) => [s.number, s.label, s.href])).toEqual([
      [1, "Entrevista e PRD", "interview"],
      [2, "Planejar", "overview"],
      [3, "Pesquisa", "analysis"],
      [4, "Telas", "screens"],
      [5, "Banco", "database"],
      [6, "Documentos técnicos", "docs"],
      [7, "Exportar", "export"],
    ]);
  });

  it("AC-2 Entrevista vale 6% por resposta até 60%, revisão 80% e aprovado 100%", () => {
    expect(step({ prd: prd("interview", 4) }, "prd")).toMatchObject({ percent: 24, status: "doing" });
    expect(step({ prd: prd("interview", 15) }, "prd").percent).toBe(60);
    expect(step({ prd: prd("review", 8) }, "prd").percent).toBe(80);
    expect(step({ prd: prd("approved") }, "prd")).toMatchObject({ percent: 100, status: "done" });
  });

  it("AC-2 Planejar: 60% com requisitos e 100% depois de salvos pelo usuário", () => {
    expect(step({}, "plan")).toMatchObject({ percent: 0, status: "todo" });
    expect(step({ requirements: [{}], latestVersion: 1 }, "plan").percent).toBe(60);
    expect(step({ requirements: [{}], latestVersion: 2 }, "plan")).toMatchObject({ percent: 100, status: "done" });
  });

  it("AC-2 Pesquisa soma um terço por análise, concorrente e persona", () => {
    expect(step({ analysis: {} }, "research").percent).toBe(33);
    expect(step({ analysis: {}, competitors: [{}], personas: [{}] }, "research").percent).toBe(100);
  });

  it("AC-2 Telas, banco e exportação ficam completas quando existem", () => {
    const input = { screens: [{}], dataModel: { tables: [{}] }, exports: [{}] };
    expect(step(input, "screens").percent).toBe(100);
    expect(step(input, "database").percent).toBe(100);
    expect(step({ dataModel: { tables: [] } }, "database").percent).toBe(0);
    expect(step(input, "export").percent).toBe(100);
  });

  it("AC-2 Documentos valem 20% por aprovado e 10% por rascunho", () => {
    const artifacts = [artifact("approved"), artifact("approved"), artifact("draft")];
    expect(step({ artifacts }, "docs")).toMatchObject({ percent: 50, status: "doing" });
  });

  it("AC-2 Progresso geral é a média das etapas e conta as concluídas", () => {
    const journey = projectJourney({ ...empty, requirements: [{}], latestVersion: 2, screens: [{}] });
    expect(journey.done).toBe(3);
    expect(journey.total).toBe(7);
    expect(journey.overall).toBe(Math.round(300 / 7));
  });

  it("AC-3 PRD não aprovado bloqueia as outras etapas", () => {
    const journey = projectJourney({ ...empty, prd: prd("review", 5), requirements: [{}], screens: [{}] });
    const [first, ...rest] = journey.steps;
    expect(first?.status).toBe("doing");
    expect(rest.every((s) => s.status === "locked" && s.percent === 0)).toBe(true);
    expect(rest[0]?.hint).toMatch(/aprovar o PRD/);
  });

  it("AC-3 Com PRD pendente só a trilha e a entrevista abrem", () => {
    expect(openWhileLocked("/projects/p", "p")).toBe(true);
    expect(openWhileLocked("/projects/p/interview", "p")).toBe(true);
    expect(openWhileLocked("/projects/p/screens", "p")).toBe(false);
  });

  it("AC-4 Projeto sem entrevista deixa PRD e documentos fora do progresso", () => {
    const journey = projectJourney({ ...empty, prd: undefined, requirements: [{}], latestVersion: 2 });
    expect(step({ prd: undefined }, "prd").status).toBe("skipped");
    expect(step({ prd: undefined }, "docs").status).toBe("skipped");
    expect(journey.total).toBe(5);
    expect(journey.overall).toBe(20);
  });

  it("AC-5 Próximo passo é a primeira etapa não concluída nem bloqueada", () => {
    expect(projectJourney({ ...empty, requirements: [{}], latestVersion: 2 }).next?.id).toBe("research");
    expect(projectJourney({ ...empty, prd: prd("interview", 1) }).next?.id).toBe("prd");
  });

  it("AC-5 Com tudo concluído não há próximo passo", () => {
    const journey = projectJourney({
      ...empty,
      requirements: [{}],
      latestVersion: 2,
      analysis: {},
      competitors: [{}],
      personas: [{}],
      screens: [{}],
      dataModel: { tables: [{}] },
      artifacts: Array.from({ length: 5 }, () => artifact("approved")),
      exports: [{}],
    });
    expect(journey.next).toBeNull();
    expect(journey.overall).toBe(100);
  });

  it("AC-6 Pesquisa tem atalhos para Análise, Radar de mercado e Personas", () => {
    expect(step({}, "research").links).toEqual([
      { href: "analysis", label: "Análise" },
      { href: "competitive", label: "Radar de mercado" },
      { href: "personas", label: "Personas" },
    ]);
  });
});

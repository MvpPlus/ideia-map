import { REBUILD_CONFIRMATION } from "@/lib/projects/rebuild";
import { MockAdapter } from "@/lib/data/mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
  localStorage.clear();
});

describe("specs/011-editar-projeto", () => {
  it("AC-1 Texto de confirmação", () => {
    expect(REBUILD_CONFIRMATION).toMatch(/planejamento/i);
    expect(REBUILD_CONFIRMATION).toMatch(/telas/i);
    expect(REBUILD_CONFIRMATION).toMatch(/busca/i);
    expect(REBUILD_CONFIRMATION).toMatch(/análise/i);
    expect(REBUILD_CONFIRMATION).toMatch(/radar/i);
    expect(REBUILD_CONFIRMATION).toMatch(/personas/i);
    expect(REBUILD_CONFIRMATION).toMatch(/banco/i);
    expect(REBUILD_CONFIRMATION).toMatch(/substitu/i);
  });

  it("AC-3 Confirmar substitui o plano", () => {
    const adapter = new MockAdapter();
    adapter.login("marina@estudio.dev", "mapa");
    const project = adapter.createProject("user_marina", {
      name: "Feira",
      description: "Pedidos",
    });
    adapter.saveAnalysis(project.id, [{ title: "CTA", detail: "Assinar" }]);
    adapter.saveCompetitors(project.id, [{ name: "Outro", url: "https://ex.com", notes: "app" }]);
    adapter.savePersonas(project.id, [
      { name: "Ana", job: "Feirante", stories: ["comprar"], acceptance: ["pedido"] },
    ]);
    adapter.saveDataModel(project.id, {
      tables: [{ name: "pedidos", columns: [{ name: "id", type: "uuid", pk: true }], rls: "dono" }],
      notes: "rascunho",
    });
    adapter.saveUrlFetch(project.id, { url: "https://ex.com", text: "html", error: null });
    const oldReqIds = adapter.listRequirements(project.id).map((r) => r.id);

    adapter.rebuildProjectFromPlan(project.id, {
      name: "Feira 2",
      description: "Entregas da semana",
      plan: {
        requirements: [{ title: "Rota", description: "Mapa do dia", priority: "alta" }],
        screens: [
          {
            name: "Mapa",
            route: "/mapa",
            description: "Rotas",
            components: [{ name: "Lista de paradas", actions: ["abrir"] }],
          },
        ],
      },
    });

    const next = adapter.getProject(project.id);
    expect(next?.name).toBe("Feira 2");
    expect(next?.description).toBe("Entregas da semana");
    const reqs = adapter.listRequirements(project.id);
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.title).toBe("Rota");
    expect(oldReqIds.includes(reqs[0]!.id)).toBe(false);
    expect(adapter.listScreens(project.id)).toHaveLength(1);
    expect(adapter.listScreens(project.id)[0]?.name).toBe("Mapa");
    expect(adapter.getAnalysis(project.id)).toBeUndefined();
    expect(adapter.listCompetitors(project.id)).toHaveLength(0);
    expect(adapter.listPersonas(project.id)).toHaveLength(0);
    expect(adapter.getDataModel(project.id)).toBeUndefined();
    expect(adapter.listUrlFetches(project.id)).toHaveLength(0);
  });
});

import { MockAdapter } from "@/lib/data/mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";

function repo() {
  return new MockAdapter();
}

beforeEach(() => {
  localStorage.clear();
});

describe("specs/001-core-mock", () => {
  it("AC-1 Login exige senha", () => {
    expect(() => repo().login("marina@estudio.dev", "  ")).toThrow("Informe a senha.");
  });

  it("AC-2 Papel admin", () => {
    const session = repo().login("admin@ideiamap.dev", "mapa");
    expect(session.user.role).toBe("admin");
  });

  it("AC-2 Plano persistido", () => {
    const adapter = repo();
    const { user } = adapter.login("marina@estudio.dev", "mapa");
    const project = adapter.createProject(user.id, {
      name: "Feira",
      description: "Pedidos",
      plan: {
        requirements: [{ title: "Login", description: "Entrar", priority: "alta" }],
        screens: [
          {
            name: "Login",
            route: "/login",
            description: "Entrada",
            components: [{ name: "Formulário de login", actions: ["enviar"] }],
          },
          {
            name: "Painel",
            route: "/painel",
            description: "Lista",
            components: [{ name: "Lista de barracas", actions: ["abrir"] }],
          },
        ],
      },
    });
    const html = adapter.listScreens(project.id)[0]?.wireframe_html ?? "";
    expect(html).toContain("Formulário de login");
    expect(html).not.toMatch(/Wireframe inicial/i);
  });

  it("AC-3 Criar projeto gera artefatos", () => {
    const adapter = repo();
    const { user } = adapter.login("marina@estudio.dev", "mapa");
    const project = adapter.createProject(user.id, {
      name: "Rota da Feira",
      description: "Pedidos da semana",
    });
    expect(adapter.listRequirements(project.id).length).toBeGreaterThanOrEqual(1);
    expect(adapter.listScreens(project.id)).toHaveLength(2);
    expect(adapter.latestVersionNumber(project.id)).toBe(1);
    const credits = adapter
      .getDb()
      .credit_transactions.filter((t) => t.user_id === user.id && t.operation === "Criar projeto");
    expect(credits[0]?.credits).toBe(25);
  });

  it("AC-4 Duplicar", () => {
    const adapter = repo();
    adapter.login("marina@estudio.dev", "mapa");
    const source = adapter.listProjects("user_marina")[0];
    const copy = adapter.duplicateProject(source.id);
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toContain("(cópia)");
    expect(adapter.listRequirements(copy.id).length).toBe(adapter.listRequirements(source.id).length);
    expect(adapter.listRequirements(copy.id)[0]?.id).not.toBe(adapter.listRequirements(source.id)[0]?.id);
  });

  it("AC-5 Arquivar", () => {
    const adapter = repo();
    adapter.login("marina@estudio.dev", "mapa");
    const project = adapter.listProjects("user_marina")[0];
    adapter.archiveProject(project.id);
    expect(adapter.getProject(project.id)?.is_archived).toBe(true);
    expect(adapter.getProject(project.id)?.status).toBe("archived");
  });

  it("AC-6 Excluir", () => {
    const adapter = repo();
    adapter.login("marina@estudio.dev", "mapa");
    const project = adapter.listProjects("user_marina")[0];
    const id = project.id;
    adapter.deleteProject(id);
    expect(adapter.getProject(id)).toBeUndefined();
    expect(adapter.listRequirements(id)).toHaveLength(0);
    expect(adapter.listScreens(id)).toHaveLength(0);
  });

  it("AC-7 Salvar versão", () => {
    const adapter = repo();
    adapter.login("marina@estudio.dev", "mapa");
    const project = adapter.listProjects("user_marina").find((p) => p.id === "proj_cafe");
    const before = adapter.latestVersionNumber(project!.id);
    const next = adapter.saveVersion(project!.id);
    expect(next).toBe(before + 1);
    expect(adapter.getProject(project!.id)?.status).toBe("ready");
  });

  it("AC-8 Chat propõe requisito", () => {
    const adapter = repo();
    adapter.login("marina@estudio.dev", "mapa");
    const before = adapter.listRequirements("proj_cafe").length;
    const messages = adapter.sendChat("proj_cafe", "Inclua lista de espera");
    expect(messages.some((m) => m.role === "user")).toBe(true);
    expect(messages.some((m) => m.role === "assistant")).toBe(true);
    expect(adapter.listRequirements("proj_cafe").length).toBe(before + 1);
    expect(adapter.listRequirements("proj_cafe").at(-1)?.priority).toBe("média");
  });

  it("AC-9 Export acompanha versão", () => {
    const adapter = repo();
    adapter.login("marina@estudio.dev", "mapa");
    const version = adapter.latestVersionNumber("proj_cafe");
    const record = adapter.generateExport("proj_cafe", ["cursor"]);
    expect(record.version_number).toBe(version);
    expect(record.status).toBe("ready");
  });

  it("AC-10 Lista só do dono", () => {
    const adapter = repo();
    adapter.login("outra@studio.dev", "mapa");
    const other = adapter.getSession()!.user;
    expect(adapter.listProjects(other.id)).toHaveLength(0);
    expect(adapter.listProjects("user_marina").length).toBeGreaterThan(0);
  });
});

describe("specs/009-seguranca-rls", () => {
  it("AC-1 Isolamento de pesquisa", () => {
    const adapter = repo();
    adapter.login("outra@studio.dev", "mapa");
    expect(() => adapter.getAnalysis("proj_cafe")).toThrow(/acesso/i);
  });

  it("AC-2 Segredo da IA", () => {
    const adapter = repo();
    adapter.login("admin@ideiamap.dev", "mapa");
    adapter.saveAiSettings({
      id: "ai_1",
      openrouter_api_key: "sk-or-secret-should-not-persist",
      models: { prompt: "openai/gpt-4o-mini", prd: "openai/gpt-4o-mini", chat: "openai/gpt-4o-mini" },
    });
    expect(adapter.getAiSettings().openrouter_api_key).toBe("");
    expect(adapter.getDb().ai_settings.openrouter_api_key).toBe("");
  });
});

describe("specs/008-pesquisa persistência", () => {
  it("AC-4 Persistência", () => {
    const adapter = repo();
    adapter.login("marina@estudio.dev", "mapa");
    adapter.saveAnalysis("proj_cafe", [{ title: "CTA", detail: "Assinar na home" }]);
    expect(adapter.getAnalysis("proj_cafe")?.findings[0]?.title).toBe("CTA");
  });
});

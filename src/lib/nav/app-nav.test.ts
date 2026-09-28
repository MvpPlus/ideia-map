import { ADMIN_SECTIONS, adminSection, appNavItems } from "@/lib/nav/app-nav";
import { describe, expect, it } from "vitest";

describe("specs/017-menu-lateral-app", () => {
  it("AC-1 Usuário comum vê Projetos, Novo projeto e Perfil", () => {
    expect(appNavItems("user").map((i) => [i.label, i.href])).toEqual([
      ["Projetos", "/dashboard"],
      ["Novo projeto", "/projects/new"],
      ["Perfil", "/profile"],
    ]);
  });

  it("AC-1 Admin vê também Administração", () => {
    expect(appNavItems("admin").at(-1)).toMatchObject({ label: "Administração", href: "/admin" });
  });

  it("AC-2 Seções do admin na ordem, cada uma com endereço próprio", () => {
    expect(ADMIN_SECTIONS.map((s) => [s.label, `/admin/${s.slug}`])).toEqual([
      ["OpenRouter", "/admin/openrouter"],
      ["Consumo", "/admin/consumo"],
      ["Usuários", "/admin/usuarios"],
      ["Planos", "/admin/planos"],
      ["Jobs", "/admin/jobs"],
      ["Templates", "/admin/templates"],
      ["Auditoria", "/admin/auditoria"],
      ["Custos", "/admin/custos"],
    ]);
  });

  it("AC-2 /admin e seção desconhecida abrem OpenRouter", () => {
    expect(adminSection(undefined).label).toBe("OpenRouter");
    expect(adminSection("nao-existe").label).toBe("OpenRouter");
    expect(adminSection("consumo").label).toBe("Consumo");
  });
});

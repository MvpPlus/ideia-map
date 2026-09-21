import { buildWireframeHtml } from "@/lib/screens/wireframe";
import { describe, expect, it } from "vitest";

describe("specs/007-screen-wireframe", () => {
  it("AC-1 Blocos dos componentes", () => {
    const html = buildWireframeHtml({
      name: "Login",
      route: "/login",
      description: "Entrada do feirante",
      components: [
        { name: "Formulário de login", actions: ["enviar login"] },
        { name: "Botão de cadastro", actions: ["navegar para cadastro"] },
      ],
    });
    expect(html).toContain("Login");
    expect(html).toContain("/login");
    expect(html).toContain("Formulário de login");
    expect(html).toContain("Botão de cadastro");
    expect(html).not.toMatch(/Wireframe inicial/i);
  });
});

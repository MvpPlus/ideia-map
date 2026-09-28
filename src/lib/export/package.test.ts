import { buildExportFiles, exportTree, standalonePrompt } from "@/lib/export/package";
import type { ArtifactKind, ExportTarget, ProjectArtifact, ProjectPrd } from "@/lib/types";
import { describe, expect, it } from "vitest";

const project = { name: "Horta Viva", description: "Troca de mudas no condomínio" };
const requirements = [{ title: "Catálogo de mudas", description: "Lista de mudas para troca" }];
const screens = [{ name: "Catálogo", route: "/catalogo", description: "Lista de mudas" }];
const approvedPrd: Pick<ProjectPrd, "stage" | "prd_markdown"> = {
  stage: "approved",
  prd_markdown: "# Horta Viva\n\n## Funcionalidades\n### [P0] Catálogo de mudas\n\n## Perguntas em aberto\n- Frequência dos lembretes?",
};

describe("specs/014-entrevista-prd", () => {
  it("AC-13 prd.md é o PRD aprovado completo", () => {
    const files = buildExportFiles({ project, requirements, screens, prd: approvedPrd, targets: ["cursor"] });
    expect(files["prd.md"]).toBe(approvedPrd.prd_markdown);
  });

  it("AC-13 Arquivos das IDEs mandam ler prd.md e screens.md com as regras do PRD", () => {
    const files = buildExportFiles({
      project,
      requirements,
      screens,
      prd: approvedPrd,
      targets: ["claude-code", "codex", "cursor", "antigravity"],
    });
    for (const name of ["CLAUDE.md", "AGENTS.md", ".cursor/rules/implement.md", "ANTIGRAVITY.md"]) {
      const content = files[name] ?? "";
      expect(content).toContain("prd.md");
      expect(content).toContain("screens.md");
      expect(content).toMatch(/P0/);
      expect(content).toMatch(/Fora de escopo/);
      expect(content).toMatch(/Perguntas em aberto/);
      expect(content).toMatch(/Recursos recomendados/);
    }
  });

  it("AC-13 PROMPT.md e o prompt copiado embutem o PRD", () => {
    const files = buildExportFiles({ project, requirements, screens, prd: approvedPrd, targets: ["markdown"] });
    expect(files["PROMPT.md"]).toContain("### [P0] Catálogo de mudas");
    expect(standalonePrompt({ project, requirements, screens, prd: approvedPrd })).toContain(
      "Frequência dos lembretes?",
    );
  });

  it("AC-13 Projeto sem PRD mantém prd.md de requisitos e telas", () => {
    const files = buildExportFiles({ project, requirements, screens, prd: undefined, targets: ["cursor"] });
    expect(files["prd.md"]).toContain("Catálogo de mudas: Lista de mudas para troca");
    expect(files["prd.md"]).toContain("Catálogo (/catalogo)");
  });

  it("AC-13 Árvore do pacote segue os destinos marcados", () => {
    const input = { project, requirements, screens, prd: approvedPrd, targets: ["cursor"] as ExportTarget[] };
    expect(exportTree(input)).toEqual(["README.md", "prd.md", "screens.md", ".cursor/rules/implement.md"]);
    expect(Object.keys(buildExportFiles(input))).toEqual(exportTree(input));
  });
});

function doc(kind: ArtifactKind, status: ProjectArtifact["status"], markdown: string) {
  return { kind, status, markdown };
}

const BACKEND = "# Esquema backend\n\n## SQL\n```sql\ncreate table public.mudas (id uuid primary key);\n```";
const allApproved = [
  doc("trd", "approved", "# TRD\n\n## Stack\nNext.js"),
  doc("flow", "approved", "# Fluxo do sistema"),
  doc("design", "approved", "# UI/UX Design"),
  doc("backend", "approved", BACKEND),
  doc("plan", "approved", "# Plano de implementação\n\n- [ ] Criar tabela de mudas"),
];
const wireScreens = [
  { name: "Catálogo", route: "/catalogo", description: "Lista", wireframe_html: "<html>catalogo</html>" },
  { name: "Minha conta", route: "/conta", description: "Perfil", wireframe_html: "<html>conta</html>" },
];

describe("specs/015-documentos-tecnicos", () => {
  it("AC-6 Documentos aprovados, schema.sql e wireframes entram no pacote", () => {
    const files = buildExportFiles({
      project,
      requirements,
      screens: wireScreens,
      prd: approvedPrd,
      artifacts: allApproved,
      targets: ["cursor"],
    });
    expect(Object.keys(files)).toEqual([
      "README.md",
      "prd.md",
      "screens.md",
      "trd.md",
      "flows.md",
      "design.md",
      "backend.md",
      "schema.sql",
      "plan.md",
      "wireframes/catalogo.html",
      "wireframes/minha-conta.html",
      ".cursor/rules/implement.md",
    ]);
    expect(files["trd.md"]).toBe("# TRD\n\n## Stack\nNext.js");
    expect(files["schema.sql"]).toBe("create table public.mudas (id uuid primary key);\n");
    expect(files["wireframes/catalogo.html"]).toBe("<html>catalogo</html>");
  });

  it("AC-6 Documento em revisão não entra no pacote", () => {
    const files = buildExportFiles({
      project,
      requirements,
      screens,
      prd: approvedPrd,
      artifacts: [doc("trd", "approved", "# TRD"), doc("flow", "draft", "# Fluxo rascunho")],
      targets: ["cursor"],
    });
    expect(files["trd.md"]).toBe("# TRD");
    expect(files["flows.md"]).toBeUndefined();
  });

  it("AC-6 Arquivos das IDEs listam os documentos e as regras de plano, banco e design", () => {
    const files = buildExportFiles({
      project,
      requirements,
      screens: wireScreens,
      prd: approvedPrd,
      artifacts: allApproved,
      targets: ["claude-code"],
    });
    const content = files["CLAUDE.md"] ?? "";
    for (const file of ["trd.md", "flows.md", "design.md", "backend.md", "plan.md", "schema.sql", "wireframes/"]) {
      expect(content).toContain(file);
    }
    expect(content).toMatch(/plan\.md.*fase/i);
  });

  it("AC-6 Sem documentos, as IDEs não citam arquivos que não existem", () => {
    const files = buildExportFiles({ project, requirements, screens, prd: approvedPrd, targets: ["claude-code"] });
    expect(files["CLAUDE.md"]).not.toContain("plan.md");
    expect(files["CLAUDE.md"]).not.toContain("schema.sql");
  });

  it("AC-6 PROMPT.md embute os documentos aprovados", () => {
    const files = buildExportFiles({
      project,
      requirements,
      screens,
      prd: approvedPrd,
      artifacts: allApproved,
      targets: ["markdown"],
    });
    expect(files["PROMPT.md"]).toContain("## Stack\nNext.js");
    expect(files["PROMPT.md"]).toContain("- [ ] Criar tabela de mudas");
  });
});

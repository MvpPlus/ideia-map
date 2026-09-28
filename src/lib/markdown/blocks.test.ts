import { parseMarkdownBlocks } from "@/lib/markdown/blocks";
import { describe, expect, it } from "vitest";

describe("specs/015-documentos-tecnicos", () => {
  it("AC-5 Bloco de código guarda a linguagem e o conteúdo", () => {
    const blocks = parseMarkdownBlocks("## Mapa\n```mermaid\nflowchart TD\n  a --> b\n```\nDepois");
    expect(blocks).toEqual([
      { type: "heading", level: 2, text: "Mapa" },
      { type: "code", lang: "mermaid", code: "flowchart TD\n  a --> b" },
      { type: "paragraph", text: "Depois" },
    ]);
  });

  it("AC-5 Tabela Markdown vira cabeçalho e linhas", () => {
    const blocks = parseMarkdownBlocks("| token | valor |\n| --- | :---: |\n| primária | #4F46E5 |\n| fundo | #0B1020 |");
    expect(blocks).toEqual([
      { type: "table", header: ["token", "valor"], rows: [["primária", "#4F46E5"], ["fundo", "#0B1020"]] },
    ]);
  });

  it("AC-5 Checklist, lista e lista numerada", () => {
    const blocks = parseMarkdownBlocks("- [ ] Criar tabela\n- [x] Login\n- item\n  - sub\n1. Abrir app");
    expect(blocks).toEqual([
      { type: "task", text: "Criar tabela", done: false },
      { type: "task", text: "Login", done: true },
      { type: "bullet", text: "item", nested: false },
      { type: "bullet", text: "sub", nested: true },
      { type: "ordered", n: 1, text: "Abrir app" },
    ]);
  });

  it("AC-5 Bloco de código sem fechamento vai até o fim", () => {
    expect(parseMarkdownBlocks("```sql\ncreate table x();")).toEqual([
      { type: "code", lang: "sql", code: "create table x();" },
    ]);
  });
});

import { parseMarkdownBlocks } from "@/lib/markdown/blocks";

/** Só no navegador: o parser do Mermaid precisa de DOM. Devolve o primeiro erro de sintaxe ou "". */
export async function mermaidProblem(markdown: string): Promise<string> {
  const diagrams = parseMarkdownBlocks(markdown).filter((b) => b.type === "code" && b.lang === "mermaid");
  if (!diagrams.length) return "";
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  for (const diagram of diagrams) {
    if (diagram.type !== "code") continue;
    try {
      await mermaid.parse(diagram.code);
    } catch (err) {
      return (err instanceof Error ? err.message : String(err)).slice(0, 400);
    }
  }
  return "";
}

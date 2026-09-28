import { requestAi } from "@/lib/ai/client";
import { dataRepository } from "@/lib/data";
import { mermaidProblem } from "@/lib/markdown/mermaid-check";
import type { ArtifactKind } from "@/lib/types";

/** Só no navegador: pede o documento à IA e, se o diagrama Mermaid não validar, pede a correção até duas vezes. */
export async function requestArtifactMarkdown(opts: {
  projectId: string;
  kind: ArtifactKind;
  prd: string;
  model?: string;
  feedback?: string;
}): Promise<string> {
  const repo = dataRepository();
  const existing = repo.listArtifacts(opts.projectId);
  const ask = (current?: string, request?: string) =>
    requestAi<{ markdown: string }>("/api/ai/artifact", {
      method: "POST",
      body: JSON.stringify({
        kind: opts.kind,
        prd: opts.prd,
        artifacts: existing,
        screens: repo.listScreens(opts.projectId),
        requirements: repo.listRequirements(opts.projectId),
        current,
        feedback: request,
        model: opts.model,
      }),
    }).then((r) => r.markdown);
  let markdown = await ask(
    opts.feedback ? existing.find((a) => a.kind === opts.kind)?.markdown : undefined,
    opts.feedback,
  );
  for (let fix = 0; fix < 2; fix++) {
    const problem = await mermaidProblem(markdown);
    if (!problem) break;
    markdown = await ask(
      markdown,
      `O diagrama Mermaid não passou no validador: ${problem}\nCorrija só a sintaxe do diagrama (ids simples, rótulos entre aspas duplas, uma ligação por linha, rótulo de seta colado nas barras: a -->|"texto"| b) e mantenha o resto do documento igual.`,
    );
  }
  return markdown;
}

import { completeLlm } from "@/lib/ai/complete";
import { resolveModel } from "@/lib/ai/openrouter";
import { parseWebFill, WEB_FILL_SYSTEM } from "@/lib/ai/research";
import { buildWebSearchQuery, formatWebHits, searchTheWeb } from "@/lib/ai/web-search";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      findings?: { title: string }[];
      model?: string;
    };
    const name = body.name?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    if (!name || !description) {
      return NextResponse.json({ error: "Informe nome e descrição do projeto." }, { status: 400 });
    }
    const query = buildWebSearchQuery({ name, description, findings: body.findings });
    const { source, hits } = await searchTheWeb(query);
    if (hits.length === 0) {
      return NextResponse.json({ error: "A busca não devolveu resultados." }, { status: 502 });
    }
    const content = await completeLlm({
      model: resolveModel(body.model),
      purpose: "web-search",
      messages: [
        { role: "system", content: WEB_FILL_SYSTEM },
        {
          role: "user",
          content: `App: ${name}\nIdeia: ${description}\nQuery: ${query}\nFonte: ${source}\n\nResultados:\n${formatWebHits(hits)}`,
        },
      ],
    });
    return NextResponse.json({ query, source, hits, ...parseWebFill(content) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na busca.";
    console.error("[web-search]", message);
    const status = /API_KEY|AI_STUDIO/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

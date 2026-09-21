import { completeLlm } from "@/lib/ai/complete";
import { resolveModel } from "@/lib/ai/openrouter";
import {
  parseAnalysis,
  parseCompetitive,
  parseDatabase,
  parsePersonas,
  RESEARCH_SYSTEM,
  type ResearchKind,
} from "@/lib/ai/research";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const KINDS = new Set<ResearchKind>(["analysis", "competitive", "personas", "database"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: string;
      model?: string;
      briefing?: string;
      pageText?: string;
    };
    const kind = body.kind as ResearchKind;
    if (!KINDS.has(kind)) {
      return NextResponse.json({ error: "Tipo de pesquisa inválido." }, { status: 400 });
    }
    const briefing = body.briefing?.trim() ?? "";
    if (!briefing) {
      return NextResponse.json({ error: "Informe o briefing do projeto." }, { status: 400 });
    }
    const page = body.pageText?.trim();
    const content = await completeLlm({
      model: resolveModel(body.model),
      purpose: kind,
      messages: [
        { role: "system", content: RESEARCH_SYSTEM[kind] },
        {
          role: "user",
          content: `Briefing:\n${briefing}${page ? `\n\nTexto coletado da URL:\n${page}` : "\n\nNão houve coleta de URL."}`,
        },
      ],
    });
    const parsed =
      kind === "analysis"
        ? parseAnalysis(content)
        : kind === "competitive"
          ? parseCompetitive(content)
          : kind === "personas"
            ? parsePersonas(content)
            : parseDatabase(content);
    return NextResponse.json({ kind, ...parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na síntese.";
    const status = /API_KEY|AI_STUDIO/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

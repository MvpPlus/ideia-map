import { completeLlm } from "@/lib/ai/complete";
import { githubLookup, verifyPrdResources } from "@/lib/ai/github-verify";
import { resolveModel } from "@/lib/ai/openrouter";
import { buildPrdMessages, parsePrd, prdToMarkdown } from "@/lib/ai/prd";
import type { InterviewQuestion } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      briefing?: string;
      questions?: InterviewQuestion[];
      currentPrd?: string;
      feedback?: string;
      model?: string;
    };
    const briefing = body.briefing?.trim() ?? "";
    if (!briefing) {
      return NextResponse.json({ error: "Informe a ideia do projeto." }, { status: 400 });
    }
    const content = await completeLlm({
      model: resolveModel(body.model),
      purpose: "prd",
      messages: buildPrdMessages({
        briefing,
        questions: Array.isArray(body.questions) ? body.questions : [],
        currentPrd: body.currentPrd,
        feedback: body.feedback,
      }),
    });
    const doc = parsePrd(content);
    doc.resources = await verifyPrdResources(doc.resources, githubLookup());
    return NextResponse.json({ prd: prdToMarkdown(doc) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao gerar o PRD.";
    const status = /API_KEY|AI_STUDIO/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

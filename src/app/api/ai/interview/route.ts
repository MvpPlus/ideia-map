import { completeLlm } from "@/lib/ai/complete";
import {
  answeredQuestions,
  buildInterviewMessages,
  interviewShouldFinish,
  nextInterviewTurn,
} from "@/lib/ai/interview";
import { resolveModel } from "@/lib/ai/openrouter";
import type { InterviewQuestion } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      briefing?: string;
      questions?: InterviewQuestion[];
      model?: string;
    };
    const briefing = body.briefing?.trim() ?? "";
    if (!briefing) {
      return NextResponse.json({ error: "Informe a ideia do projeto." }, { status: 400 });
    }
    const questions = Array.isArray(body.questions) ? body.questions : [];
    if (interviewShouldFinish(answeredQuestions(questions).length)) {
      return NextResponse.json({ turn: { done: true, summary: "" } });
    }
    const turn = await nextInterviewTurn((repair) =>
      completeLlm({
        model: resolveModel(body.model),
        purpose: "interview",
        messages: [...buildInterviewMessages(briefing, questions), ...repair],
      }),
    );
    return NextResponse.json({ turn });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao gerar a pergunta.";
    const status = /API_KEY|AI_STUDIO/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

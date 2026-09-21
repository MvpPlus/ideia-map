import { PLAN_SYSTEM, parsePlan, resolveModel } from "@/lib/ai/openrouter";
import { completeLlm } from "@/lib/ai/complete";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      referenceUrl?: string;
      model?: string;
    };
    const name = body.name?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    if (!name || !description) {
      return NextResponse.json({ error: "Informe nome e descrição." }, { status: 400 });
    }
    const url = body.referenceUrl?.trim();
    const content = await completeLlm({
      model: resolveModel(body.model),
      purpose: "plan",
      messages: [
        { role: "system", content: PLAN_SYSTEM },
        {
          role: "user",
          content: `Nome: ${name}\nDescrição: ${description}${url ? `\nURL de referência (não crawleie; use só como contexto): ${url}` : ""}`,
        },
      ],
    });
    return NextResponse.json({ plan: parsePlan(content) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao gerar o plano.";
    const status = /API_KEY|AI_STUDIO/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

import { completeLlm } from "@/lib/ai/complete";
import { parseChatReply, CHAT_SYSTEM, resolveModel } from "@/lib/ai/openrouter";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      model?: string;
      context?: string;
    };
    const message = body.message?.trim() ?? "";
    if (!message) {
      return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });
    }
    const content = await completeLlm({
      model: resolveModel(body.model),
      purpose: "chat",
      messages: [
        { role: "system", content: CHAT_SYSTEM },
        {
          role: "user",
          content: `${body.context?.trim() ? `Contexto do projeto:\n${body.context.trim()}\n\n` : ""}Pedido: ${message}`,
        },
      ],
    });
    return NextResponse.json(parseChatReply(content));
  } catch (err) {
    const text = err instanceof Error ? err.message : "Falha no chat.";
    const status = /API_KEY|AI_STUDIO/i.test(text) ? 503 : 502;
    return NextResponse.json({ error: text }, { status });
  }
}

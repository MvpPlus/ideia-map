import { runProjectChat } from "@/lib/chat/run-chat";
import { resolveModel } from "@/lib/ai/openrouter";
import { NextResponse } from "next/server";

export const maxDuration = 60;

async function filesFromForm(form: FormData): Promise<{ name: string; type: string; bytes: Buffer }[]> {
  const out: { name: string; type: string; bytes: Buffer }[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("file") && key !== "files") continue;
    if (typeof value === "string") continue;
    const file = value as File;
    const bytes = Buffer.from(await file.arrayBuffer());
    out.push({ name: file.name || "anexo", type: file.type || "", bytes });
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let message = "";
    let context = "";
    let model: string | undefined;
    let files: { name: string; type: string; bytes: Buffer }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      message = String(form.get("message") ?? "");
      context = String(form.get("context") ?? "");
      model = String(form.get("model") ?? "") || undefined;
      files = await filesFromForm(form);
    } else {
      const body = (await request.json()) as {
        message?: string;
        model?: string;
        context?: string;
      };
      message = body.message ?? "";
      context = body.context ?? "";
      model = body.model;
    }

    const result = await runProjectChat({
      message,
      context,
      model: model ? resolveModel(model) : undefined,
      files,
    });
    return NextResponse.json({
      reply: result.reply,
      requirement: result.requirement,
      attachmentNotes: result.attachmentNotes,
    });
  } catch (err) {
    const text = err instanceof Error ? err.message : "Falha no chat.";
    const status = /API_KEY|AI_STUDIO|GROQ|Configure/i.test(text) ? 503 : 400;
    const network = /recusou|falha|502|Whisper|visão/i.test(text) ? 502 : status;
    return NextResponse.json({ error: text }, { status: /Configure|tipo|grande|mensagem|anexe/i.test(text) ? status : network });
  }
}

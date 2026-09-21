import { maskSecret } from "@/lib/ai/env-file";
import { loadGoogleAiKey, loadOpenRouterKey, saveGoogleAiKey, saveOpenRouterKey } from "@/lib/ai/persist-env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { key?: string; google?: string; openrouter?: string };
    const openrouter = body.openrouter?.trim() || (body.key && !body.google ? body.key.trim() : "");
    const google = body.google?.trim() ?? "";
    if (!openrouter && !google) throw new Error("Informe a chave da OpenRouter ou do Google AI Studio.");
    if (openrouter) saveOpenRouterKey(openrouter);
    if (google) saveGoogleAiKey(google);
    const storedOr = loadOpenRouterKey();
    const storedGoogle = loadGoogleAiKey();
    return NextResponse.json({
      configured: Boolean(storedOr),
      masked: storedOr ? maskSecret(storedOr) : null,
      googleConfigured: Boolean(storedGoogle),
      googleMasked: storedGoogle ? maskSecret(storedGoogle) : null,
      location: ".env.local",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível gravar a chave.";
    const status = message.includes("só leitura") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

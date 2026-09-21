import { listGoogleModels } from "@/lib/ai/gemini";
import { mergeModelCatalog } from "@/lib/ai/model-options";
import { listModels } from "@/lib/ai/openrouter";
import { loadGoogleAiKey, loadOpenRouterKey } from "@/lib/ai/persist-env";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const freeOnly = new URL(request.url).searchParams.get("free") === "1";
  const openrouterKey = loadOpenRouterKey();
  const googleKey = loadGoogleAiKey();
  if (!openrouterKey && !googleKey) {
    return NextResponse.json(
      { error: "Configure OPENROUTER_API_KEY ou GOOGLE_AI_STUDIO_API_KEY em .env.local" },
      { status: 503 },
    );
  }
  const errors: string[] = [];
  let openrouter: { id: string; name: string; free: boolean }[] = [];
  let google: { id: string; name: string }[] = [];
  if (openrouterKey) {
    try {
      const listed = await listModels({ apiKey: openrouterKey });
      openrouter = freeOnly ? listed.filter((m) => m.free) : listed.slice(0, 80);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "OpenRouter não listou modelos.");
    }
  }
  if (googleKey) {
    try {
      google = await listGoogleModels({ apiKey: googleKey });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Google AI Studio não listou modelos.");
    }
  }
  const models = mergeModelCatalog(openrouter, google);
  if (!models.length) {
    const text = errors[0] ?? "Nenhum modelo encontrado.";
    const status = /API_KEY|AI_STUDIO/i.test(text) ? 503 : 502;
    return NextResponse.json({ error: text }, { status });
  }
  return NextResponse.json({
    models,
    openrouterCount: openrouter.length,
    googleCount: google.length,
    warnings: errors,
  });
}

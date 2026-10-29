import { maskSecret } from "@/lib/ai/env-file";
import { isCloudflareConfigured } from "@/lib/ai/cloudflare";
import {
  loadCloudflareAccountId,
  loadCloudflareApiToken,
  loadGoogleAiKey,
  loadGroqKey,
  loadMistralKey,
  loadOpenRouterKey,
  saveCloudflareCredentials,
  saveGoogleAiKey,
  saveGroqKey,
  saveMistralKey,
  saveOpenRouterKey,
} from "@/lib/ai/persist-env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      key?: string;
      google?: string;
      openrouter?: string;
      groq?: string;
      mistral?: string;
      cloudflareToken?: string;
      cloudflareAccountId?: string;
    };
    const openrouter = body.openrouter?.trim() || (body.key && !body.google ? body.key.trim() : "");
    const google = body.google?.trim() ?? "";
    const groq = body.groq?.trim() ?? "";
    const mistral = body.mistral?.trim() ?? "";
    const cloudflareToken = body.cloudflareToken?.trim() ?? "";
    const cloudflareAccountId = body.cloudflareAccountId?.trim() ?? "";
    if (!openrouter && !google && !groq && !mistral && !cloudflareToken && !cloudflareAccountId) {
      throw new Error("Informe a chave da OpenRouter, Google, Groq, Mistral ou Cloudflare.");
    }
    if (openrouter) saveOpenRouterKey(openrouter);
    if (google) saveGoogleAiKey(google);
    if (groq) saveGroqKey(groq);
    if (mistral) saveMistralKey(mistral);
    if (cloudflareToken || cloudflareAccountId) {
      saveCloudflareCredentials({ token: cloudflareToken, accountId: cloudflareAccountId });
    }
    const storedOr = loadOpenRouterKey();
    const storedGoogle = loadGoogleAiKey();
    const storedGroq = loadGroqKey();
    const storedMistral = loadMistralKey();
    const storedCfToken = loadCloudflareApiToken();
    const storedCfAccount = loadCloudflareAccountId();
    const cloudflareConfigured = isCloudflareConfigured({
      token: storedCfToken,
      accountId: storedCfAccount,
    });
    return NextResponse.json({
      configured: Boolean(storedOr),
      masked: storedOr ? maskSecret(storedOr) : null,
      googleConfigured: Boolean(storedGoogle),
      googleMasked: storedGoogle ? maskSecret(storedGoogle) : null,
      groqConfigured: Boolean(storedGroq),
      groqMasked: storedGroq ? maskSecret(storedGroq) : null,
      mistralConfigured: Boolean(storedMistral),
      mistralMasked: storedMistral ? maskSecret(storedMistral) : null,
      cloudflareConfigured,
      cloudflareTokenMasked: storedCfToken ? maskSecret(storedCfToken) : null,
      cloudflareAccountMasked: storedCfAccount ? maskSecret(storedCfAccount) : null,
      location: ".env.local",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível gravar a chave.";
    const status = message.includes("só leitura") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

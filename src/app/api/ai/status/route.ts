import { maskSecret } from "@/lib/ai/env-file";
import { isCloudflareConfigured } from "@/lib/ai/cloudflare";
import {
  loadCloudflareAccountId,
  loadCloudflareApiToken,
  loadGoogleAiKey,
  loadGroqKey,
  loadMistralKey,
  loadOpenRouterKey,
} from "@/lib/ai/persist-env";
import { serverModel } from "@/lib/ai/openrouter";
import { NextResponse } from "next/server";

export async function GET() {
  const key = loadOpenRouterKey();
  const google = loadGoogleAiKey();
  const groq = loadGroqKey();
  const mistral = loadMistralKey();
  const cloudflareToken = loadCloudflareApiToken();
  const cloudflareAccountId = loadCloudflareAccountId();
  const cloudflareConfigured = isCloudflareConfigured({
    token: cloudflareToken,
    accountId: cloudflareAccountId,
  });
  return NextResponse.json({
    configured: Boolean(key),
    masked: key ? maskSecret(key) : null,
    model: key ? serverModel() : null,
    googleConfigured: Boolean(google),
    googleMasked: google ? maskSecret(google) : null,
    groqConfigured: Boolean(groq),
    groqMasked: groq ? maskSecret(groq) : null,
    mistralConfigured: Boolean(mistral),
    mistralMasked: mistral ? maskSecret(mistral) : null,
    cloudflareConfigured,
    cloudflareTokenMasked: cloudflareToken ? maskSecret(cloudflareToken) : null,
    cloudflareAccountMasked: cloudflareAccountId ? maskSecret(cloudflareAccountId) : null,
  });
}

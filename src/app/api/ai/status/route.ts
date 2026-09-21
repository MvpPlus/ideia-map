import { maskSecret } from "@/lib/ai/env-file";
import { loadGoogleAiKey, loadOpenRouterKey } from "@/lib/ai/persist-env";
import { serverModel } from "@/lib/ai/openrouter";
import { NextResponse } from "next/server";

export async function GET() {
  const key = loadOpenRouterKey();
  const google = loadGoogleAiKey();
  return NextResponse.json({
    configured: Boolean(key),
    masked: key ? maskSecret(key) : null,
    model: key ? serverModel() : null,
    googleConfigured: Boolean(google),
    googleMasked: google ? maskSecret(google) : null,
  });
}

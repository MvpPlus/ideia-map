import { maskSecret } from "@/lib/ai/env-file";
import { loadTelegramBotToken, loadTelegramWebhookSecret } from "@/lib/ai/persist-env";
import { getTelegramWebhookInfo } from "@/lib/telegram/api";
import { suggestedTelegramWebhookUrl } from "@/lib/telegram/webhook-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const token = loadTelegramBotToken();
  const secret = loadTelegramWebhookSecret();
  const vercel = process.env.VERCEL_URL?.trim();
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (vercel ? `https://${vercel.replace(/^https?:\/\//, "")}` : "") ||
    "http://localhost:3001";
  const siteUrl = site.startsWith("http") ? site : `https://${site}`;
  let webhookUrl: string | null = null;
  let webhookError: string | null = null;
  if (token) {
    try {
      const info = await getTelegramWebhookInfo();
      webhookUrl = info.url ?? null;
      webhookError = info.last_error_message ?? null;
    } catch (err) {
      webhookError = err instanceof Error ? err.message : "Falha ao consultar webhook.";
    }
  }
  return NextResponse.json({
    botConfigured: Boolean(token),
    botMasked: token ? maskSecret(token) : null,
    secretConfigured: Boolean(secret),
    secretMasked: secret ? maskSecret(secret) : null,
    suggestedWebhookUrl: suggestedTelegramWebhookUrl(siteUrl),
    webhookUrl,
    webhookError,
  });
}

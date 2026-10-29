import { loadTelegramBotToken, loadTelegramWebhookSecret } from "@/lib/ai/persist-env";
import { setTelegramWebhook } from "@/lib/telegram/api";
import { suggestedTelegramWebhookUrl } from "@/lib/telegram/webhook-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = loadTelegramBotToken();
    const secret = loadTelegramWebhookSecret();
    if (!token) throw new Error("Grave o TELEGRAM_BOT_TOKEN antes de registrar o webhook.");
    if (!secret) throw new Error("Grave o TELEGRAM_WEBHOOK_SECRET antes de registrar o webhook.");
    const body = (await request.json().catch(() => ({}))) as { url?: string };
    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.VERCEL_URL?.trim() ||
      "";
    const siteUrl = site
      ? site.startsWith("http")
        ? site
        : `https://${site}`
      : "";
    const url = (body.url?.trim() || (siteUrl ? suggestedTelegramWebhookUrl(siteUrl) : "")).replace(
      /\/$/,
      "",
    );
    if (!url.startsWith("https://") && !url.includes("localhost")) {
      throw new Error(
        "Informe uma URL https (Vercel ou túnel) ou defina NEXT_PUBLIC_SITE_URL.",
      );
    }
    const webhookUrl = url.endsWith("/api/telegram") ? url : suggestedTelegramWebhookUrl(url);
    await setTelegramWebhook({ url: webhookUrl, secretToken: secret });
    return NextResponse.json({ ok: true, url: webhookUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao registrar webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

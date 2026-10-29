import { maskSecret } from "@/lib/ai/env-file";
import {
  loadTelegramBotToken,
  loadTelegramWebhookSecret,
  saveTelegramCredentials,
} from "@/lib/ai/persist-env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { botToken?: string; webhookSecret?: string };
    saveTelegramCredentials({
      botToken: body.botToken,
      webhookSecret: body.webhookSecret,
    });
    const token = loadTelegramBotToken();
    const secret = loadTelegramWebhookSecret();
    return NextResponse.json({
      botConfigured: Boolean(token),
      botMasked: token ? maskSecret(token) : null,
      secretConfigured: Boolean(secret),
      secretMasked: secret ? maskSecret(secret) : null,
      location: ".env.local",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível gravar.";
    const status = message.includes("só leitura") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

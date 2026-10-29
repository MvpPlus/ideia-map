import { handleTelegramUpdate } from "@/lib/telegram/handle";
import type { TelegramUpdate } from "@/lib/telegram/api";
import {
  telegramBotConfigured,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram/webhook-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!telegramBotConfigured()) {
    return NextResponse.json(
      { error: "Configure TELEGRAM_BOT_TOKEN (Admin → Telegram)." },
      { status: 503 },
    );
  }
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyTelegramWebhookSecret(secretHeader)) {
    return NextResponse.json({ error: "Secret do webhook inválido." }, { status: 401 });
  }
  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("[telegram]", err);
  }
  return NextResponse.json({ ok: true });
}

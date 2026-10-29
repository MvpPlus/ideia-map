import { loadTelegramBotToken } from "@/lib/ai/persist-env";

export type InlineButton = { text: string; callback_data: string };

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string; username?: string };
    message?: { chat: { id: number }; message_id: number };
  };
};

function botToken(): string {
  const token = loadTelegramBotToken();
  if (!token) throw new Error("Configure TELEGRAM_BOT_TOKEN em .env.local");
  return token;
}

async function callTelegram<T>(
  method: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { ok?: boolean; description?: string; result?: T };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} falhou (${response.status}).`);
  }
  return payload.result as T;
}

export function inlineKeyboard(rows: InlineButton[][]): {
  inline_keyboard: { text: string; callback_data: string }[][];
} {
  return { inline_keyboard: rows };
}

export async function sendTelegramMessage(opts: {
  chatId: number;
  text: string;
  replyMarkup?: ReturnType<typeof inlineKeyboard>;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  await callTelegram(
    "sendMessage",
    {
      chat_id: opts.chatId,
      text: opts.text.slice(0, 4096),
      disable_web_page_preview: true,
      ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
    },
    opts.fetchImpl,
  );
}

export async function answerCallbackQuery(opts: {
  callbackQueryId: string;
  text?: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  await callTelegram(
    "answerCallbackQuery",
    { callback_query_id: opts.callbackQueryId, text: opts.text?.slice(0, 200) },
    opts.fetchImpl,
  );
}

export async function setTelegramWebhook(opts: {
  url: string;
  secretToken: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  await callTelegram(
    "setWebhook",
    {
      url: opts.url,
      secret_token: opts.secretToken,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    },
    opts.fetchImpl,
  );
}

export async function getTelegramWebhookInfo(fetchImpl: typeof fetch = fetch): Promise<{
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_message?: string;
}> {
  return callTelegram("getWebhookInfo", {}, fetchImpl);
}

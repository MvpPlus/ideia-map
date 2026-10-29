import { loadTelegramBotToken, loadTelegramWebhookSecret } from "@/lib/ai/persist-env";

export function telegramBotConfigured(): boolean {
  return Boolean(loadTelegramBotToken());
}

export function verifyTelegramWebhookSecret(headerValue: string | null): boolean {
  const expected = loadTelegramWebhookSecret();
  if (!expected) return false;
  return Boolean(headerValue) && headerValue === expected;
}

export function suggestedTelegramWebhookUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/telegram`;
}

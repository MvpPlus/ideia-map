import { maskSecret } from "@/lib/ai/env-file";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/persist-env", () => ({
  loadTelegramBotToken: vi.fn(() => ""),
  loadTelegramWebhookSecret: vi.fn(() => "segredo-certo"),
}));

import { loadTelegramWebhookSecret } from "@/lib/ai/persist-env";
import {
  suggestedTelegramWebhookUrl,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram/webhook-auth";

describe("specs/020-telegram-bot webhook", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("AC-2 rejeita secret errado ou ausente", () => {
    vi.mocked(loadTelegramWebhookSecret).mockReturnValue("segredo-certo");
    expect(verifyTelegramWebhookSecret(null)).toBe(false);
    expect(verifyTelegramWebhookSecret("errado")).toBe(false);
    expect(verifyTelegramWebhookSecret("segredo-certo")).toBe(true);
  });

  it("AC-1 mascara token sem expor o valor completo", () => {
    const masked = maskSecret("1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw");
    expect(masked).not.toContain("AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw");
    expect(masked.includes("••••")).toBe(true);
  });

  it("AC-1 sugere URL /api/telegram", () => {
    expect(suggestedTelegramWebhookUrl("https://app.example.com/")).toBe(
      "https://app.example.com/api/telegram",
    );
  });
});

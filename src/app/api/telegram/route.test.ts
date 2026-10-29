import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/telegram/handle", () => ({
  handleTelegramUpdate: vi.fn(async () => undefined),
}));

vi.mock("@/lib/telegram/webhook-auth", () => ({
  telegramBotConfigured: vi.fn(),
  verifyTelegramWebhookSecret: vi.fn(),
}));

import { POST } from "@/app/api/telegram/route";
import { handleTelegramUpdate } from "@/lib/telegram/handle";
import {
  telegramBotConfigured,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram/webhook-auth";

describe("specs/020-telegram-bot POST /api/telegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-2 sem token do bot responde 503", async () => {
    vi.mocked(telegramBotConfigured).mockReturnValue(false);
    const response = await POST(
      new Request("http://localhost/api/telegram", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(503);
  });

  it("AC-2 secret inválido responde 401", async () => {
    vi.mocked(telegramBotConfigured).mockReturnValue(true);
    vi.mocked(verifyTelegramWebhookSecret).mockReturnValue(false);
    const response = await POST(
      new Request("http://localhost/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_id: 1 }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("AC-2 secret ok processa update e retorna 200", async () => {
    vi.mocked(telegramBotConfigured).mockReturnValue(true);
    vi.mocked(verifyTelegramWebhookSecret).mockReturnValue(true);
    const response = await POST(
      new Request("http://localhost/api/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "ok",
        },
        body: JSON.stringify({
          update_id: 1,
          message: { message_id: 1, text: "/start", chat: { id: 1 }, from: { id: 2 } },
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(handleTelegramUpdate).toHaveBeenCalled();
  });
});

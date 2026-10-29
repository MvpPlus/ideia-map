import { chunkTelegramText, TELEGRAM_CHUNK_LIMIT } from "@/lib/telegram/chunk";
import { describe, expect, it } from "vitest";

describe("specs/020-telegram-bot chunk", () => {
  it("AC-6 e AC-7 fatia texto longo sem ultrapassar o limite", () => {
    const text = "bloco\n\n".repeat(2000).slice(0, 8000);
    const parts = chunkTelegramText(text);
    expect(parts.length).toBeGreaterThanOrEqual(3);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(TELEGRAM_CHUNK_LIMIT);
    }
  });

  it("AC-6 texto curto fica em um pedaço", () => {
    expect(chunkTelegramText("olá")).toEqual(["olá"]);
  });
});

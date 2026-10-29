import { beforeEach, describe, expect, it, vi } from "vitest";

const loadGoogleAiKey = vi.fn();
const loadGroqKey = vi.fn();
const completeLlm = vi.fn();
const completeGeminiVision = vi.fn();
const recordCompletion = vi.fn();
const transcribeAudio = vi.fn();

vi.mock("@/lib/ai/persist-env", () => ({
  loadGoogleAiKey: () => loadGoogleAiKey(),
  loadGroqKey: () => loadGroqKey(),
}));

vi.mock("@/lib/ai/complete", () => ({
  completeLlm: (...args: unknown[]) => completeLlm(...args),
}));

vi.mock("@/lib/ai/gemini-vision", () => ({
  completeGeminiVision: (...args: unknown[]) => completeGeminiVision(...args),
}));

vi.mock("@/lib/ai/persist-usage", () => ({
  recordCompletion: (...args: unknown[]) => recordCompletion(...args),
}));

vi.mock("@/lib/chat/attachments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chat/attachments")>();
  return {
    ...actual,
    transcribeAudio: (...args: unknown[]) => transcribeAudio(...args),
  };
});

describe("specs/019 runProjectChat", () => {
  beforeEach(() => {
    vi.resetModules();
    loadGoogleAiKey.mockReturnValue("AIza");
    loadGroqKey.mockReturnValue("gsk");
    completeLlm.mockReset();
    completeGeminiVision.mockReset();
    recordCompletion.mockReset();
    transcribeAudio.mockReset();
  });

  it("texto sem imagem usa completeLlm", async () => {
    completeLlm.mockResolvedValueOnce('{"reply":"ok","requirement":null}');
    const { runProjectChat } = await import("@/lib/chat/run-chat");
    const result = await runProjectChat({ message: "oi", context: "Projeto X" });
    expect(result.reply).toBe("ok");
    expect(completeLlm).toHaveBeenCalled();
  });

  it("imagem exige Gemini vision", async () => {
    completeGeminiVision.mockResolvedValueOnce({
      text: '{"reply":"vi","requirement":null}',
      provider: "google",
      model: "gemini-2.0-flash",
      promptTokens: 1,
      completionTokens: 1,
    });
    const { runProjectChat } = await import("@/lib/chat/run-chat");
    const result = await runProjectChat({
      message: "o que é isso?",
      context: "Página",
      files: [{ name: "a.png", type: "image/png", bytes: Buffer.from("x") }],
    });
    expect(result.reply).toBe("vi");
    expect(completeGeminiVision).toHaveBeenCalled();
    expect(recordCompletion).toHaveBeenCalled();
  });
});

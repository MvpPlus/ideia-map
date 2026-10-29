import { completeGeminiVision } from "@/lib/ai/gemini-vision";
import { describe, expect, it, vi } from "vitest";

describe("specs/019-chat-flutuante-projeto AC-4", () => {
  it("AC-4 Imagem via Gemini vision", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"reply":"vi a imagem","requirement":null}' } ] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      }),
    });
    const result = await completeGeminiVision({
      apiKey: "AIza-test",
      prompt: "O que há na imagem?",
      images: [{ mimeType: "image/png", base64: "aaa" }],
      json: true,
      fetchImpl,
    });
    expect(result.provider).toBe("google");
    expect(result.text).toContain("imagem");
    expect(fetchImpl).toHaveBeenCalled();
  });
});

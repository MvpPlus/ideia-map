import { completeOpenAiCompatible } from "@/lib/ai/openai-compatible";
import { completeGroq, completeMistral } from "@/lib/ai/groq-mistral";
import { describe, expect, it, vi } from "vitest";

describe("specs/018-provedores-ia-gratis AC-3", () => {
  it("AC-3 Complete OpenAI-compatible Groq", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "llama-3.3-70b-versatile",
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    const result = await completeGroq({
      apiKey: "gsk-test",
      messages: [{ role: "user", content: "oi" }],
      fetchImpl,
    });
    expect(result.provider).toBe("groq");
    expect(result.text).toContain("ok");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer gsk-test" }),
      }),
    );
  });

  it("AC-3 Complete OpenAI-compatible Mistral", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "mistral-small-latest",
        choices: [{ message: { content: "olá" } }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      }),
    });
    const result = await completeMistral({
      apiKey: "mst-test",
      messages: [{ role: "user", content: "oi" }],
      json: false,
      fetchImpl,
    });
    expect(result.provider).toBe("mistral");
    expect(result.text).toBe("olá");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.mistral.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer mst-test" }),
      }),
    );
  });

  it("recusa sem chave", async () => {
    await expect(
      completeOpenAiCompatible({
        provider: "groq",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: "",
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toThrow(/GROQ|chave|Configure/i);
  });
});

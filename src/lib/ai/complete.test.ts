import { beforeEach, describe, expect, it, vi } from "vitest";

const loadOpenRouterKey = vi.fn();
const loadGoogleAiKey = vi.fn();
const loadGroqKey = vi.fn();
const loadMistralKey = vi.fn();
const loadCloudflareApiToken = vi.fn();
const loadCloudflareAccountId = vi.fn();
const completeChat = vi.fn();
const completeGemini = vi.fn();
const completeGroq = vi.fn();
const completeMistral = vi.fn();
const completeCloudflare = vi.fn();
const recordCompletion = vi.fn();

vi.mock("@/lib/ai/persist-env", () => ({
  loadOpenRouterKey: () => loadOpenRouterKey(),
  loadGoogleAiKey: () => loadGoogleAiKey(),
  loadGroqKey: () => loadGroqKey(),
  loadMistralKey: () => loadMistralKey(),
  loadCloudflareApiToken: () => loadCloudflareApiToken(),
  loadCloudflareAccountId: () => loadCloudflareAccountId(),
}));

vi.mock("@/lib/ai/cloudflare", () => ({
  isCloudflareConfigured: (opts: { token: string; accountId: string }) =>
    Boolean(opts.token.trim() && opts.accountId.trim()),
  completeCloudflare: (...args: unknown[]) => completeCloudflare(...args),
  cloudflareModelHint: (requested?: string) =>
    requested?.startsWith("@cf/") ? requested : undefined,
}));

vi.mock("@/lib/ai/openrouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openrouter")>();
  return { ...actual, completeChat: (...args: unknown[]) => completeChat(...args), resolveModel: (m?: string) => m || "openrouter/free" };
});

vi.mock("@/lib/ai/gemini", () => ({
  completeGemini: (...args: unknown[]) => completeGemini(...args),
}));

vi.mock("@/lib/ai/groq-mistral", () => ({
  completeGroq: (...args: unknown[]) => completeGroq(...args),
  completeMistral: (...args: unknown[]) => completeMistral(...args),
  modelHintForProvider: (provider: string, requested?: string) => {
    if (!requested) return undefined;
    if (provider === "groq" && requested.includes("llama")) return requested;
    if (provider === "mistral" && requested.includes("mistral")) return requested;
    return undefined;
  },
}));

vi.mock("@/lib/ai/persist-usage", () => ({
  recordCompletion: (...args: unknown[]) => recordCompletion(...args),
}));

describe("specs/018-provedores-ia-gratis AC-4", () => {
  beforeEach(() => {
    vi.resetModules();
    loadOpenRouterKey.mockReturnValue("or-key");
    loadGoogleAiKey.mockReturnValue("");
    loadGroqKey.mockReturnValue("gsk-key");
    loadMistralKey.mockReturnValue("");
    loadCloudflareApiToken.mockReturnValue("");
    loadCloudflareAccountId.mockReturnValue("");
    completeChat.mockReset();
    completeGemini.mockReset();
    completeGroq.mockReset();
    completeMistral.mockReset();
    completeCloudflare.mockReset();
    recordCompletion.mockReset();
  });

  it("AC-4 Failover quando o primeiro falha", async () => {
    const { resetProviderTick } = await import("@/lib/ai/providers");
    resetProviderTick();
    completeChat.mockRejectedValueOnce(new Error("rate limit"));
    completeGroq.mockResolvedValueOnce({
      text: "ok-groq",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      promptTokens: 1,
      completionTokens: 1,
    });
    const { completeLlm } = await import("@/lib/ai/complete");
    const text = await completeLlm({ messages: [{ role: "user", content: "oi" }], json: false });
    expect(text).toBe("ok-groq");
    expect(completeChat).toHaveBeenCalled();
    expect(completeGroq).toHaveBeenCalled();
    expect(recordCompletion).toHaveBeenCalled();
  });
});

import { completeCloudflare, cloudflareBaseUrl } from "@/lib/ai/cloudflare";
import { describe, expect, it, vi } from "vitest";

describe("specs/018-provedores-ia-gratis AC-3 Cloudflare", () => {
  it("AC-3 Complete OpenAI-compatible Cloudflare", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "@cf/meta/llama-3.1-8b-instruct",
        choices: [{ message: { content: "ok-cf" } }],
        usage: { prompt_tokens: 4, completion_tokens: 2 },
      }),
    });
    const result = await completeCloudflare({
      apiToken: "cf-token",
      accountId: "acct-xyz",
      messages: [{ role: "user", content: "oi" }],
      json: false,
      fetchImpl,
    });
    expect(result.provider).toBe("cloudflare");
    expect(result.text).toBe("ok-cf");
    expect(fetchImpl).toHaveBeenCalledWith(
      `${cloudflareBaseUrl("acct-xyz")}/chat/completions`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer cf-token" }),
      }),
    );
  });
});

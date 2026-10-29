import { upsertDotEnv, readDotEnvValue } from "@/lib/ai/env-file";
import { cloudflareBaseUrl, isCloudflareConfigured } from "@/lib/ai/cloudflare";
import { nextProviderOrder, resetProviderTick, routeFreeChain } from "@/lib/ai/providers";
import { describe, expect, it } from "vitest";

describe("specs/018-provedores-ia-gratis", () => {
  it("AC-1 Chaves no env", () => {
    const next = upsertDotEnv(
      "DATA_SOURCE=mock\nOPENROUTER_API_KEY=sk-or-x\nGOOGLE_AI_STUDIO_API_KEY=AIza-x\n",
      {
        GROQ_API_KEY: "gsk-test",
        MISTRAL_API_KEY: "mst-test",
        CLOUDFLARE_API_TOKEN: "cf-token",
        CLOUDFLARE_ACCOUNT_ID: "acct-123",
      },
    );
    expect(readDotEnvValue(next, "DATA_SOURCE")).toBe("mock");
    expect(readDotEnvValue(next, "OPENROUTER_API_KEY")).toBe("sk-or-x");
    expect(readDotEnvValue(next, "GOOGLE_AI_STUDIO_API_KEY")).toBe("AIza-x");
    expect(readDotEnvValue(next, "GROQ_API_KEY")).toBe("gsk-test");
    expect(readDotEnvValue(next, "MISTRAL_API_KEY")).toBe("mst-test");
    expect(readDotEnvValue(next, "CLOUDFLARE_API_TOKEN")).toBe("cf-token");
    expect(readDotEnvValue(next, "CLOUDFLARE_ACCOUNT_ID")).toBe("acct-123");
  });

  it("AC-2 Balance com cinco", () => {
    resetProviderTick();
    const five = ["openrouter", "google", "groq", "mistral", "cloudflare"] as const;
    expect(nextProviderOrder([...five])[0]).toBe("openrouter");
    expect(nextProviderOrder([...five])[0]).toBe("google");
    expect(nextProviderOrder([...five])[0]).toBe("groq");
    expect(nextProviderOrder([...five])[0]).toBe("mistral");
    expect(nextProviderOrder([...five])[0]).toBe("cloudflare");
    expect(nextProviderOrder([...five])[0]).toBe("openrouter");
  });

  it("AC-7 Cloudflare incompleto", () => {
    expect(isCloudflareConfigured({ token: "cf-token", accountId: "" })).toBe(false);
    expect(isCloudflareConfigured({ token: "", accountId: "acct" })).toBe(false);
    expect(isCloudflareConfigured({ token: "cf-token", accountId: "acct" })).toBe(true);
    expect(cloudflareBaseUrl("acct-123")).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acct-123/ai/v1",
    );
  });

  it("cadeia free Groq/Mistral começa no pedido", () => {
    expect(routeFreeChain("llama-3.3-70b-versatile", ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"])[0]).toBe(
      "llama-3.3-70b-versatile",
    );
    expect(routeFreeChain(undefined, ["mistral-small-latest", "open-mistral-nemo"]).length).toBeGreaterThanOrEqual(1);
  });
});

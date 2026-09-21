import { listGoogleModels, isGoogleChatModel, googleModelId } from "@/lib/ai/gemini";
import { nextProviderOrder, resetProviderTick, routeGoogleChain } from "@/lib/ai/providers";
import { upsertDotEnv, readDotEnvValue } from "@/lib/ai/env-file";
import { describe, expect, it, vi } from "vitest";

describe("specs/010-google-ai", () => {
  it("AC-1 Chave Google", () => {
    const next = upsertDotEnv("DATA_SOURCE=mock\nOPENROUTER_API_KEY=sk-or-x\n", {
      GOOGLE_AI_STUDIO_API_KEY: "AIza-test-key",
    });
    expect(readDotEnvValue(next, "DATA_SOURCE")).toBe("mock");
    expect(readDotEnvValue(next, "OPENROUTER_API_KEY")).toBe("sk-or-x");
    expect(readDotEnvValue(next, "GOOGLE_AI_STUDIO_API_KEY")).toBe("AIza-test-key");
  });

  it("AC-2 Balance", () => {
    resetProviderTick();
    expect(nextProviderOrder(["openrouter", "google"])[0]).toBe("openrouter");
    expect(nextProviderOrder(["openrouter", "google"])[0]).toBe("google");
    expect(nextProviderOrder(["openrouter", "google"])[0]).toBe("openrouter");
  });

  it("AC-3 Cadeia Google", () => {
    const chain = routeGoogleChain("gemini-2.0-flash");
    expect(chain[0]).toBe("gemini-2.0-flash");
    expect(chain.length).toBeLessThanOrEqual(5);
    expect(chain.length).toBeGreaterThanOrEqual(2);
  });

  it("AC-4 lista Google generateContent", async () => {
    expect(googleModelId("models/gemini-2.0-flash")).toBe("gemini-2.0-flash");
    expect(isGoogleChatModel({ name: "models/gemini-embedding", supportedGenerationMethods: ["generateContent"] })).toBe(
      false,
    );
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: "models/gemini-2.0-flash",
            displayName: "Gemini 2.0 Flash",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/embedding-001",
            displayName: "Embedding",
            supportedGenerationMethods: ["embedContent"],
          },
        ],
      }),
    });
    const listed = await listGoogleModels({ apiKey: "AIza-test", fetchImpl });
    expect(listed).toEqual([{ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" }]);
  });
});

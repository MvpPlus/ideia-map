import { estimateUsd, summarizeUsage, type LlmUsageEvent } from "@/lib/ai/usage";
import { describe, expect, it } from "vitest";

describe("specs/012-consumo-ia", () => {
  it("AC-1 Estimativa por modelo", () => {
    const mini = estimateUsd("openrouter", "openai/gpt-4o-mini", 1_000_000, 1_000_000);
    expect(mini).toBeCloseTo(0.15 + 0.6, 5);
    expect(estimateUsd("openrouter", "z-ai/glm-5.2:free", 10_000, 2_000)).toBe(0);
    expect(estimateUsd("google", "gemini-2.0-flash", 1_000_000, 0)).toBeGreaterThan(0);
  });

  it("AC-2 Resumo", () => {
    const events: LlmUsageEvent[] = [
      {
        id: "u1",
        at: "2026-09-19T12:00:00.000Z",
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        purpose: "plan",
        promptTokens: 1000,
        completionTokens: 500,
        estimatedUsd: 0.00045,
      },
      {
        id: "u2",
        at: "2026-09-19T12:01:00.000Z",
        provider: "google",
        model: "gemini-2.0-flash",
        purpose: "chat",
        promptTokens: 200,
        completionTokens: 100,
        estimatedUsd: 0.00004,
      },
      {
        id: "u3",
        at: "2026-09-19T12:02:00.000Z",
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        purpose: "research",
        promptTokens: 300,
        completionTokens: 50,
        estimatedUsd: 0.000075,
      },
    ];
    const summary = summarizeUsage(events);
    expect(summary.calls).toBe(3);
    expect(summary.promptTokens).toBe(1500);
    expect(summary.completionTokens).toBe(650);
    expect(summary.totalTokens).toBe(2150);
    expect(summary.estimatedUsd).toBeCloseTo(0.000565, 8);
    expect(summary.byModel).toHaveLength(2);
    const mini = summary.byModel.find((row) => row.model === "openai/gpt-4o-mini");
    expect(mini?.calls).toBe(2);
    expect(mini?.tokens).toBe(1850);
    expect(summary.byProvider.find((row) => row.provider === "openrouter")?.calls).toBe(2);
    expect(summary.byProvider.find((row) => row.provider === "google")?.calls).toBe(1);
  });
});

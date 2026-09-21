import { maskSecret, upsertDotEnv, readDotEnvValue } from "@/lib/ai/env-file";
import { describe, expect, it } from "vitest";

describe("specs/005-openrouter env", () => {
  it("AC-5 Gravar no env local", () => {
    const previous = "DATA_SOURCE=mock\nOPENROUTER_API_KEY=old\n";
    const next = upsertDotEnv(previous, { OPENROUTER_API_KEY: "sk-or-new" });
    expect(readDotEnvValue(next, "DATA_SOURCE")).toBe("mock");
    expect(readDotEnvValue(next, "OPENROUTER_API_KEY")).toBe("sk-or-new");
    expect(next.match(/OPENROUTER_API_KEY=/g)).toHaveLength(1);
  });

  it("AC-6 Status mascarado", () => {
    const key = "sk-or-v1-abcdefghijklmnop";
    const masked = maskSecret(key);
    expect(masked).not.toBe(key);
    expect(masked.startsWith("sk-or-")).toBe(true);
    expect(masked.includes("abcdefghijklmnop")).toBe(false);
  });
});

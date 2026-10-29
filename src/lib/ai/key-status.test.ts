import { maskSecret } from "@/lib/ai/env-file";
import { describe, expect, it } from "vitest";

describe("specs/018-provedores-ia-gratis AC-6", () => {
  it("AC-6 Status mascarado", () => {
    const groq = "gsk_abcdefghijklmnopqrstuvwxyz";
    const mistral = "mst_abcdefghijklmnopqrstuvwxyz";
    const cf = "cf_token_abcdefghijklmnopqrstuvwxyz";
    expect(maskSecret(groq)).not.toBe(groq);
    expect(maskSecret(groq).includes("gsk_")).toBe(true);
    expect(maskSecret(mistral)).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(maskSecret(cf)).not.toBe(cf);
  });
});

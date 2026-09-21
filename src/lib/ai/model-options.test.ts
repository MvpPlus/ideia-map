import { catalogLabel, isFreeModel, mergeModelCatalog, optionsForSlot } from "@/lib/ai/model-options";
import { describe, expect, it } from "vitest";

const free = [
  { id: "meta/llama-free", name: "Llama free" },
  { id: "google/gemma-free", name: "Gemma free" },
];

describe("specs/005-openrouter AC-7", () => {
  it("AC-7 Dropdowns de modelos", () => {
    expect(optionsForSlot(free, "meta/llama-free")).toEqual(free);
    const withCurrent = optionsForSlot(free, "openai/gpt-4o-mini");
    expect(withCurrent[0]?.id).toBe("openai/gpt-4o-mini");
    expect(withCurrent.map((m) => m.id)).toContain("google/gemma-free");
  });

  it("marca :free e preço zero como gratuito", () => {
    expect(isFreeModel({ id: "meta/llama-3.3-70b-instruct:free" })).toBe(true);
    expect(isFreeModel({ id: "openai/gpt-4o-mini", pricing: { prompt: "0.15" } })).toBe(false);
    expect(isFreeModel({ id: "google/gemma", pricing: { prompt: "0.0", completion: "0" } })).toBe(true);
  });
});

describe("specs/010-google-ai AC-4", () => {
  it("AC-4 Catálogo dos dois", () => {
    expect(catalogLabel({ id: "z-ai/glm", name: "GLM", provider: "openrouter" })).toBe("Openrouter: GLM");
    expect(catalogLabel({ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google" })).toBe(
      "Google Ai Studio: Gemini 2.0 Flash",
    );
    const merged = mergeModelCatalog(
      [{ id: "z-ai/glm-5.2:free", name: "GLM 5.2" }],
      [{ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" }],
    );
    expect(merged.some((m) => m.provider === "openrouter" && m.id === "z-ai/glm-5.2:free")).toBe(true);
    expect(merged.some((m) => m.provider === "google" && m.id === "gemini-2.0-flash")).toBe(true);
  });
});

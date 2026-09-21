import { assertSupabaseOk, ownProfilePatch } from "@/lib/data/supabase-sync";
import { describe, expect, it } from "vitest";

describe("specs/013-supabase-vercel-online AC-5", () => {
  it("assertSupabaseOk lança com mensagem do PostgREST", () => {
    expect(() => assertSupabaseOk({ error: { message: "RLS", code: "42501" } }, "projects")).toThrow(/projects.*RLS/i);
  });

  it("assertSupabaseOk não lança sem error", () => {
    expect(() => assertSupabaseOk({ error: null }, "projects")).not.toThrow();
  });

  it("AC-6 ownProfilePatch não inclui role", () => {
    const patch = ownProfilePatch({
      email: "a@b.com",
      name: "Test",
      preferences: { locale: "pt-BR", digest: true },
    });
    expect(patch).toEqual({
      email: "a@b.com",
      name: "Test",
      preferences: { locale: "pt-BR", digest: true },
    });
    expect(patch).not.toHaveProperty("role");
  });
});

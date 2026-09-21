import { assertSupabaseOk } from "@/lib/data/supabase-sync";
import { describe, expect, it } from "vitest";

describe("specs/013-supabase-vercel-online AC-5", () => {
  it("assertSupabaseOk lança com mensagem do PostgREST", () => {
    expect(() => assertSupabaseOk({ error: { message: "RLS", code: "42501" } }, "projects")).toThrow(/projects.*RLS/i);
  });

  it("assertSupabaseOk não lança sem error", () => {
    expect(() => assertSupabaseOk({ error: null }, "projects")).not.toThrow();
  });
});

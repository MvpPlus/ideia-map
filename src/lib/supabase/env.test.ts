import {
  assertNoServiceRoleInPublicEnv,
  isSupabaseDataSource,
  publicSupabaseEnv,
  resolvePublishableKey,
  serverSupabaseSecretKey,
} from "@/lib/supabase/env";
import { afterEach, describe, expect, it } from "vitest";

describe("specs/013-supabase-vercel-online", () => {
  afterEach(() => {
    delete process.env.DATA_SOURCE;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("AC-1 Sem secret/service role no cliente", () => {
    expect(() => assertNoServiceRoleInPublicEnv()).not.toThrow();
    process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY = "sb_secret_x";
    expect(() => assertNoServiceRoleInPublicEnv()).toThrow(/PUBLISHABLE_KEY/i);
    delete process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = "legacy";
    expect(() => assertNoServiceRoleInPublicEnv()).toThrow(/PUBLISHABLE_KEY/i);
  });

  it("AC-1 publishable tem prioridade sobre anon legacy", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_new";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy_anon";
    expect(resolvePublishableKey()).toBe("sb_publishable_new");
  });

  it("publicSupabaseEnv usa publishable", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";
    expect(publicSupabaseEnv()).toEqual({
      url: "https://x.supabase.co",
      publishableKey: "sb_publishable_x",
    });
  });

  it("serverSupabaseSecretKey só lê variáveis de servidor", () => {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_srv";
    expect(serverSupabaseSecretKey()).toBe("sb_secret_srv");
  });

  it("detecta DATA_SOURCE supabase", () => {
    process.env.DATA_SOURCE = "supabase";
    expect(isSupabaseDataSource()).toBe(true);
  });
});

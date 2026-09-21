export function isSupabaseDataSource(): boolean {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? process.env.DATA_SOURCE ?? "mock";
  return source.trim() === "supabase";
}

/** Chave pública (browser + SSR com JWT). Prefer publishable; anon legacy até 2026. */
export function resolvePublishableKey(): string {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (publishable) return publishable;
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function publicSupabaseEnv(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = resolvePublishableKey();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** Só servidor — bypass RLS; nunca importar em código de cliente. */
export function serverSupabaseSecretKey(): string | null {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  if (secret) return secret;
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return legacy || null;
}

const FORBIDDEN_PUBLIC_SUPABASE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_SECRET_KEYS",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SERVICE_ROLE_KEY",
] as const;

/** AC-1: secret / service role nunca vão para o bundle público. */
export function assertNoServiceRoleInPublicEnv(): void {
  for (const key of FORBIDDEN_PUBLIC_SUPABASE_KEYS) {
    if (process.env[key]?.trim()) {
      throw new Error(`Remova ${key} — use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no cliente e SUPABASE_SECRET_KEY só no servidor.`);
    }
  }
}

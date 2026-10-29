import { isSupabaseMode } from "@/lib/data";
import { openTelegramAdapter } from "@/lib/telegram/server-db";
import { publicSupabaseEnv } from "@/lib/supabase/env";
import type { Session, User } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";

export type TelegramAuthResult = {
  session: Session;
  accessToken?: string;
  refreshToken?: string;
};

export async function telegramLogin(email: string, password: string): Promise<TelegramAuthResult> {
  if (!password.trim()) throw new Error("Informe a senha.");
  if (isSupabaseMode()) {
    const env = publicSupabaseEnv();
    if (!env) throw new Error("Supabase não configurado no servidor.");
    const client = createClient(env.url, env.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "E-mail ou senha incorretos.");
    }
    const user: User = {
      id: data.user.id,
      email: data.user.email ?? email.trim().toLowerCase(),
      name:
        (data.user.user_metadata?.name as string | undefined)?.trim() ||
        (data.user.email ?? email).split("@")[0] ||
        "Conta",
      role: "user",
      preferences: { locale: "pt-BR", digest: true },
    };
    return {
      session: { user },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  const { adapter, commit } = openTelegramAdapter(null);
  const session = adapter.login(email, password);
  commit();
  return { session };
}

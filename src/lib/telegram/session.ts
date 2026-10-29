import { isSupabaseMode } from "@/lib/data";
import { publicSupabaseEnv, serverSupabaseSecretKey } from "@/lib/supabase/env";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type TelegramFsmState =
  | "guest"
  | "await_email"
  | "await_password"
  | "home"
  | "project"
  | "await_project_name"
  | "await_project_idea";

export type TelegramSession = {
  telegramUserId: number;
  state: TelegramFsmState;
  emailDraft?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  accessToken?: string;
  refreshToken?: string;
  projectId?: string;
  updatedAt: string;
};

type StoreFile = { sessions: Record<string, TelegramSession> };

const memoryFallback = new Map<string, TelegramSession>();

export function telegramSessionsPath(): string {
  return join(process.cwd(), ".ideiamap-telegram-sessions.json");
}

function emptySession(telegramUserId: number): TelegramSession {
  return {
    telegramUserId,
    state: "guest",
    updatedAt: new Date().toISOString(),
  };
}

function useSupabaseSessions(): boolean {
  return isSupabaseMode() && Boolean(serverSupabaseSecretKey() && publicSupabaseEnv());
}

function adminClient() {
  const env = publicSupabaseEnv();
  const secret = serverSupabaseSecretKey();
  if (!env || !secret) throw new Error("Supabase secret não configurado para sessões Telegram.");
  return createClient(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readFileStore(): StoreFile {
  try {
    const parsed = JSON.parse(readFileSync(telegramSessionsPath(), "utf8")) as StoreFile;
    return { sessions: parsed.sessions ?? {} };
  } catch {
    return { sessions: {} };
  }
}

function writeFileStore(store: StoreFile) {
  try {
    writeFileSync(telegramSessionsPath(), JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Vercel / disco só leitura — cai no Map em memória desta instância
  }
}

async function readSession(telegramUserId: number): Promise<TelegramSession | null> {
  const key = String(telegramUserId);
  if (useSupabaseSessions()) {
    const { data, error } = await adminClient()
      .from("telegram_sessions")
      .select("payload")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();
    if (error) throw new Error(`Sessão Telegram: ${error.message}`);
    if (!data?.payload) return null;
    return data.payload as TelegramSession;
  }
  const fromFile = readFileStore().sessions[key];
  if (fromFile) return fromFile;
  return memoryFallback.get(key) ?? null;
}

async function writeSession(session: TelegramSession): Promise<TelegramSession> {
  const next = { ...session, updatedAt: new Date().toISOString() };
  if (useSupabaseSessions()) {
    const { error } = await adminClient().from("telegram_sessions").upsert({
      telegram_user_id: session.telegramUserId,
      payload: next,
      updated_at: next.updatedAt,
    });
    if (error) throw new Error(`Sessão Telegram: ${error.message}`);
    return next;
  }
  const store = readFileStore();
  store.sessions[String(session.telegramUserId)] = next;
  writeFileStore(store);
  memoryFallback.set(String(session.telegramUserId), next);
  return next;
}

export async function getTelegramSession(telegramUserId: number): Promise<TelegramSession> {
  const existing = await readSession(telegramUserId);
  if (existing) return existing;
  return writeSession(emptySession(telegramUserId));
}

export async function saveTelegramSession(session: TelegramSession): Promise<TelegramSession> {
  return writeSession(session);
}

export async function clearTelegramAuth(session: TelegramSession): Promise<TelegramSession> {
  return saveTelegramSession({
    telegramUserId: session.telegramUserId,
    state: "guest",
    updatedAt: new Date().toISOString(),
  });
}

export function isLoggedIn(session: TelegramSession): boolean {
  return Boolean(session.userId);
}

export function resetTelegramSessionsForTests(): void {
  writeFileStore({ sessions: {} });
  memoryFallback.clear();
}

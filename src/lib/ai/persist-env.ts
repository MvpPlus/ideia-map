import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readDotEnvValue, upsertDotEnv } from "@/lib/ai/env-file";

export const OPENROUTER_ENV_KEY = "OPENROUTER_API_KEY";
export const GOOGLE_AI_ENV_KEY = "GOOGLE_AI_STUDIO_API_KEY";
export const GROQ_ENV_KEY = "GROQ_API_KEY";
export const MISTRAL_ENV_KEY = "MISTRAL_API_KEY";
export const CLOUDFLARE_TOKEN_ENV_KEY = "CLOUDFLARE_API_TOKEN";
export const CLOUDFLARE_ACCOUNT_ENV_KEY = "CLOUDFLARE_ACCOUNT_ID";
export const TELEGRAM_BOT_TOKEN_ENV_KEY = "TELEGRAM_BOT_TOKEN";
export const TELEGRAM_WEBHOOK_SECRET_ENV_KEY = "TELEGRAM_WEBHOOK_SECRET";
const GOOGLE_KEY_ALIASES = ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"];

export function envLocalPath(): string {
  return join(process.cwd(), ".env.local");
}

export function loadOpenRouterKey(): string {
  return loadEnvSecret(OPENROUTER_ENV_KEY);
}

export function loadGoogleAiKey(): string {
  const primary = loadEnvSecret(GOOGLE_AI_ENV_KEY);
  if (primary) return primary;
  for (const alias of GOOGLE_KEY_ALIASES) {
    const value = loadEnvSecret(alias);
    if (value) return value;
  }
  return "";
}

export function loadGroqKey(): string {
  return loadEnvSecret(GROQ_ENV_KEY);
}

export function loadMistralKey(): string {
  return loadEnvSecret(MISTRAL_ENV_KEY);
}

export function loadCloudflareApiToken(): string {
  return loadEnvSecret(CLOUDFLARE_TOKEN_ENV_KEY);
}

export function loadCloudflareAccountId(): string {
  return loadEnvSecret(CLOUDFLARE_ACCOUNT_ENV_KEY);
}

function loadEnvSecret(name: string): string {
  try {
    const fromFile = readDotEnvValue(readFileSync(envLocalPath(), "utf8"), name)?.trim();
    if (fromFile) return fromFile;
  } catch {
    // arquivo ainda não existe
  }
  return process.env[name]?.trim() ?? "";
}

function writeEnvSecrets(entries: Record<string, string>): void {
  let existing = "";
  try {
    existing = readFileSync(envLocalPath(), "utf8");
  } catch {
    existing = "DATA_SOURCE=mock\n";
  }
  try {
    writeFileSync(envLocalPath(), upsertDotEnv(existing, entries), "utf8");
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (/EACCES|EROFS|EPERM/.test(code)) {
      throw new Error(
        "Neste ambiente o disco é só leitura. Defina as chaves como secret (Vercel/Supabase).",
      );
    }
    throw err;
  }
}

export function saveOpenRouterKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Informe a chave da OpenRouter.");
  writeEnvSecrets({ [OPENROUTER_ENV_KEY]: trimmed });
}

export function saveGoogleAiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Informe a chave do Google AI Studio.");
  writeEnvSecrets({ [GOOGLE_AI_ENV_KEY]: trimmed });
}

export function saveGroqKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Informe a chave da Groq.");
  writeEnvSecrets({ [GROQ_ENV_KEY]: trimmed });
}

export function saveMistralKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Informe a chave da Mistral.");
  writeEnvSecrets({ [MISTRAL_ENV_KEY]: trimmed });
}

export function saveCloudflareCredentials(opts: { token?: string; accountId?: string }): void {
  const token = opts.token?.trim() ?? "";
  const accountId = opts.accountId?.trim() ?? "";
  if (!token && !accountId) {
    throw new Error("Informe o API token e/ou o Account ID da Cloudflare.");
  }
  const entries: Record<string, string> = {};
  if (token) entries[CLOUDFLARE_TOKEN_ENV_KEY] = token;
  if (accountId) entries[CLOUDFLARE_ACCOUNT_ENV_KEY] = accountId;
  writeEnvSecrets(entries);
}

export function loadTelegramBotToken(): string {
  return loadEnvSecret(TELEGRAM_BOT_TOKEN_ENV_KEY);
}

export function loadTelegramWebhookSecret(): string {
  return loadEnvSecret(TELEGRAM_WEBHOOK_SECRET_ENV_KEY);
}

export function saveTelegramCredentials(opts: { botToken?: string; webhookSecret?: string }): void {
  const botToken = opts.botToken?.trim() ?? "";
  const webhookSecret = opts.webhookSecret?.trim() ?? "";
  if (!botToken && !webhookSecret) {
    throw new Error("Informe o token do bot e/ou o secret do webhook.");
  }
  const entries: Record<string, string> = {};
  if (botToken) entries[TELEGRAM_BOT_TOKEN_ENV_KEY] = botToken;
  if (webhookSecret) entries[TELEGRAM_WEBHOOK_SECRET_ENV_KEY] = webhookSecret;
  writeEnvSecrets(entries);
}

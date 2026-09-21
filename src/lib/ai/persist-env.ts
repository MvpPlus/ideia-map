import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readDotEnvValue, upsertDotEnv } from "@/lib/ai/env-file";

export const OPENROUTER_ENV_KEY = "OPENROUTER_API_KEY";
export const GOOGLE_AI_ENV_KEY = "GOOGLE_AI_STUDIO_API_KEY";
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

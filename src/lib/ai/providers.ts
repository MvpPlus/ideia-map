export type LlmProvider = "openrouter" | "google" | "groq" | "mistral" | "cloudflare";

export const DEFAULT_GOOGLE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
] as const;

export const DEFAULT_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-3.1-70b-versatile",
] as const;

export const DEFAULT_MISTRAL_MODELS = [
  "mistral-small-latest",
  "open-mistral-nemo",
  "mistral-small-2503",
] as const;

export const DEFAULT_CLOUDFLARE_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
] as const;

let providerTick = 0;

export function resetProviderTick() {
  providerTick = 0;
}

/** Alterna o provedor inicial a cada chamada (round-robin). */
export function nextProviderOrder(available: LlmProvider[]): LlmProvider[] {
  if (available.length <= 1) return [...available];
  const start = providerTick++ % available.length;
  return [...available.slice(start), ...available.slice(0, start)];
}

export function routeFreeChain(primary: string | undefined, defaults: readonly string[]): string[] {
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const id of [primary?.trim() ?? "", ...defaults]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    chain.push(id);
    if (chain.length === 5) break;
  }
  return chain;
}

export function routeGoogleChain(primary?: string): string[] {
  return routeFreeChain(primary, DEFAULT_GOOGLE_MODELS);
}

export function routeGroqChain(primary?: string): string[] {
  return routeFreeChain(primary, DEFAULT_GROQ_MODELS);
}

export function routeMistralChain(primary?: string): string[] {
  return routeFreeChain(primary, DEFAULT_MISTRAL_MODELS);
}

export function routeCloudflareChain(primary?: string): string[] {
  return routeFreeChain(primary, DEFAULT_CLOUDFLARE_MODELS);
}

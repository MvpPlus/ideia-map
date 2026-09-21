export type LlmProvider = "openrouter" | "google";

export const DEFAULT_GOOGLE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
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

export function routeGoogleChain(primary?: string): string[] {
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const id of [primary?.trim() ?? "", ...DEFAULT_GOOGLE_MODELS]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    chain.push(id);
    if (chain.length === 5) break;
  }
  return chain;
}

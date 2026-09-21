import type { LlmProvider } from "@/lib/ai/providers";

export type LlmUsageEvent = {
  id: string;
  at: string;
  provider: LlmProvider;
  model: string;
  purpose: string;
  promptTokens: number;
  completionTokens: number;
  estimatedUsd: number;
};

export type LlmCompletion = {
  text: string;
  provider: LlmProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
};

export type UsageSummary = {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  byModel: { model: string; provider: LlmProvider; calls: number; tokens: number; estimatedUsd: number }[];
  byProvider: { provider: LlmProvider; calls: number; tokens: number; estimatedUsd: number }[];
};

const RATES: { test: (model: string) => boolean; inUsd: number; outUsd: number }[] = [
  { test: (m) => /:free\b/i.test(m) || /\bfree\b/i.test(m), inUsd: 0, outUsd: 0 },
  { test: (m) => /gpt-4o-mini/i.test(m), inUsd: 0.15, outUsd: 0.6 },
  { test: (m) => /claude-3\.5-haiku|claude-3-haiku|claude-3\.5-sonnet/i.test(m), inUsd: 0.8, outUsd: 4 },
  { test: (m) => /llama/i.test(m), inUsd: 0.1, outUsd: 0.32 },
  { test: (m) => /qwen/i.test(m), inUsd: 0.07, outUsd: 0.26 },
  { test: (m) => /gemini-2\.5-flash-lite/i.test(m), inUsd: 0.1, outUsd: 0.4 },
  { test: (m) => /gemini-2\.5-flash/i.test(m), inUsd: 0.15, outUsd: 0.6 },
  { test: (m) => /gemini-2\.0-flash-lite/i.test(m), inUsd: 0.075, outUsd: 0.3 },
  { test: (m) => /gemini-2\.0-flash|gemini-1\.5-flash/i.test(m), inUsd: 0.1, outUsd: 0.4 },
];

const FALLBACK = { inUsd: 0.15, outUsd: 0.6 };

export function estimateUsd(
  _provider: LlmProvider,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rate = RATES.find((row) => row.test(model)) ?? FALLBACK;
  return (Math.max(0, promptTokens) / 1_000_000) * rate.inUsd + (Math.max(0, completionTokens) / 1_000_000) * rate.outUsd;
}

export function tokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function summarizeUsage(events: LlmUsageEvent[]): UsageSummary {
  const byModelMap = new Map<string, UsageSummary["byModel"][number]>();
  const byProviderMap = new Map<LlmProvider, UsageSummary["byProvider"][number]>();
  let promptTokens = 0;
  let completionTokens = 0;
  let estimatedUsd = 0;
  for (const event of events) {
    promptTokens += event.promptTokens;
    completionTokens += event.completionTokens;
    estimatedUsd += event.estimatedUsd;
    const tokens = event.promptTokens + event.completionTokens;
    const modelKey = `${event.provider}:${event.model}`;
    const modelRow = byModelMap.get(modelKey) ?? {
      model: event.model,
      provider: event.provider,
      calls: 0,
      tokens: 0,
      estimatedUsd: 0,
    };
    modelRow.calls += 1;
    modelRow.tokens += tokens;
    modelRow.estimatedUsd += event.estimatedUsd;
    byModelMap.set(modelKey, modelRow);
    const providerRow = byProviderMap.get(event.provider) ?? {
      provider: event.provider,
      calls: 0,
      tokens: 0,
      estimatedUsd: 0,
    };
    providerRow.calls += 1;
    providerRow.tokens += tokens;
    providerRow.estimatedUsd += event.estimatedUsd;
    byProviderMap.set(event.provider, providerRow);
  }
  return {
    calls: events.length,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedUsd,
    byModel: [...byModelMap.values()].sort((a, b) => b.tokens - a.tokens),
    byProvider: [...byProviderMap.values()].sort((a, b) => b.tokens - a.tokens),
  };
}

export function eventFromCompletion(
  completion: LlmCompletion,
  purpose: string,
  at = new Date().toISOString(),
): LlmUsageEvent {
  return {
    id: `use_${at}_${Math.random().toString(36).slice(2, 8)}`,
    at,
    provider: completion.provider,
    model: completion.model,
    purpose,
    promptTokens: completion.promptTokens,
    completionTokens: completion.completionTokens,
    estimatedUsd: estimateUsd(
      completion.provider,
      completion.model,
      completion.promptTokens,
      completion.completionTokens,
    ),
  };
}

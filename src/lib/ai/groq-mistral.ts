import { completeOpenAiCompatible } from "@/lib/ai/openai-compatible";
import type { ChatTurn } from "@/lib/ai/openrouter";
import { routeGroqChain, routeMistralChain, type LlmProvider } from "@/lib/ai/providers";
import type { LlmCompletion } from "@/lib/ai/usage";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";

export const GROQ_CATALOG = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B Versatile" },
] as const;

export const MISTRAL_CATALOG = [
  { id: "mistral-small-latest", name: "Mistral Small" },
  { id: "open-mistral-nemo", name: "Open Mistral Nemo" },
  { id: "mistral-small-2503", name: "Mistral Small 2503" },
] as const;

function shouldReroute(message: string): boolean {
  return /overloaded|rate|quota|429|503|500|unavailable|capacity|temporarily/i.test(message);
}

async function completeWithChain(opts: {
  provider: "groq" | "mistral";
  baseUrl: string;
  apiKey: string;
  chain: string[];
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
  missingKeyMessage: string;
}): Promise<LlmCompletion> {
  let lastError: unknown;
  for (const model of opts.chain) {
    try {
      return await completeOpenAiCompatible({
        provider: opts.provider,
        baseUrl: opts.baseUrl,
        apiKey: opts.apiKey,
        model,
        messages: opts.messages,
        json: opts.json,
        fetchImpl: opts.fetchImpl,
        missingKeyMessage: opts.missingKeyMessage,
      });
    } catch (err) {
      lastError = err;
      const text = err instanceof Error ? err.message : "";
      if (!shouldReroute(text) && opts.chain.indexOf(model) === opts.chain.length - 1) throw err;
      if (!shouldReroute(text) && opts.chain.length === 1) throw err;
      // tenta próximo modelo da cadeia em rate-limit/5xx; em erro de formato também tenta o próximo
      continue;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`${opts.provider} recusou todos os modelos da rota.`);
}

export async function completeGroq(opts: {
  apiKey: string;
  model?: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<LlmCompletion> {
  return completeWithChain({
    provider: "groq",
    baseUrl: GROQ_BASE_URL,
    apiKey: opts.apiKey,
    chain: routeGroqChain(opts.model),
    messages: opts.messages,
    json: opts.json,
    fetchImpl: opts.fetchImpl,
    missingKeyMessage: "Configure GROQ_API_KEY em .env.local",
  });
}

export async function completeMistral(opts: {
  apiKey: string;
  model?: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<LlmCompletion> {
  return completeWithChain({
    provider: "mistral",
    baseUrl: MISTRAL_BASE_URL,
    apiKey: opts.apiKey,
    chain: routeMistralChain(opts.model),
    messages: opts.messages,
    json: opts.json,
    fetchImpl: opts.fetchImpl,
    missingKeyMessage: "Configure MISTRAL_API_KEY em .env.local",
  });
}

export function modelHintForProvider(
  provider: Extract<LlmProvider, "groq" | "mistral">,
  requested?: string,
): string | undefined {
  const id = requested?.trim() ?? "";
  if (!id) return undefined;
  const prefix = `${provider}:`;
  const stripped = id.startsWith(prefix) ? id.slice(prefix.length) : id;
  if (provider === "groq") {
    if (/^llama-[\w.-]+$/i.test(stripped) || /^gemma-[\w.-]+$/i.test(stripped) || /^mixtral/i.test(stripped)) {
      return stripped;
    }
    return undefined;
  }
  if (/^mistral/i.test(stripped) || /^open-mistral/i.test(stripped) || /^codestral/i.test(stripped)) {
    return stripped;
  }
  return undefined;
}

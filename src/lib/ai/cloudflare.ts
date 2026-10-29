import { completeOpenAiCompatible } from "@/lib/ai/openai-compatible";
import type { ChatTurn } from "@/lib/ai/openrouter";
import { routeCloudflareChain } from "@/lib/ai/providers";
import type { LlmCompletion } from "@/lib/ai/usage";

export const CLOUDFLARE_CATALOG = [
  { id: "@cf/meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
  { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", name: "Llama 3.3 70B Instruct Fast" },
  { id: "@cf/qwen/qwen2.5-coder-32b-instruct", name: "Qwen2.5 Coder 32B" },
] as const;

export function isCloudflareConfigured(opts: { token: string; accountId: string }): boolean {
  return Boolean(opts.token.trim() && opts.accountId.trim());
}

export function cloudflareBaseUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/ai/v1`;
}

function shouldReroute(message: string): boolean {
  return /overloaded|rate|quota|429|503|500|unavailable|capacity|temporarily|busy/i.test(message);
}

export async function completeCloudflare(opts: {
  apiToken: string;
  accountId: string;
  model?: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<LlmCompletion> {
  if (!isCloudflareConfigured({ token: opts.apiToken, accountId: opts.accountId })) {
    throw new Error("Configure CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID em .env.local");
  }
  const chain = routeCloudflareChain(opts.model);
  let lastError: unknown;
  for (const model of chain) {
    try {
      return await completeOpenAiCompatible({
        provider: "cloudflare",
        baseUrl: cloudflareBaseUrl(opts.accountId),
        apiKey: opts.apiToken,
        model,
        messages: opts.messages,
        json: opts.json,
        fetchImpl: opts.fetchImpl,
        missingKeyMessage: "Configure CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID em .env.local",
      });
    } catch (err) {
      lastError = err;
      const text = err instanceof Error ? err.message : "";
      if (!shouldReroute(text) && chain.indexOf(model) === chain.length - 1) throw err;
      if (!shouldReroute(text) && chain.length === 1) throw err;
      continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Cloudflare recusou todos os modelos da rota.");
}

export function cloudflareModelHint(requested?: string): string | undefined {
  const id = requested?.trim() ?? "";
  if (!id) return undefined;
  const stripped = id.startsWith("cloudflare:") ? id.slice("cloudflare:".length) : id;
  if (stripped.startsWith("@cf/")) return stripped;
  return undefined;
}

import { cloudflareModelHint, completeCloudflare, isCloudflareConfigured } from "@/lib/ai/cloudflare";
import { completeGemini } from "@/lib/ai/gemini";
import { completeGroq, completeMistral, modelHintForProvider } from "@/lib/ai/groq-mistral";
import { completeChat, resolveModel, type ChatTurn } from "@/lib/ai/openrouter";
import {
  loadCloudflareAccountId,
  loadCloudflareApiToken,
  loadGoogleAiKey,
  loadGroqKey,
  loadMistralKey,
  loadOpenRouterKey,
} from "@/lib/ai/persist-env";
import { recordCompletion } from "@/lib/ai/persist-usage";
import { nextProviderOrder, type LlmProvider } from "@/lib/ai/providers";
import { inferCatalogProvider } from "@/lib/ai/model-options";
import type { LlmCompletion } from "@/lib/ai/usage";

export function providersForModel(available: LlmProvider[], model?: string): LlmProvider[] {
  const order = nextProviderOrder(available);
  if (!model?.trim()) return order;
  const pref = inferCatalogProvider(model);
  if (!available.includes(pref)) return order;
  return [pref, ...order.filter((p) => p !== pref)];
}

export async function completeLlm(opts: {
  model?: string;
  messages: ChatTurn[];
  json?: boolean;
  purpose?: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const openrouter = loadOpenRouterKey();
  const google = loadGoogleAiKey();
  const groq = loadGroqKey();
  const mistral = loadMistralKey();
  const cloudflareToken = loadCloudflareApiToken();
  const cloudflareAccountId = loadCloudflareAccountId();
  const cloudflareOk = isCloudflareConfigured({ token: cloudflareToken, accountId: cloudflareAccountId });
  const available: LlmProvider[] = [];
  if (openrouter) available.push("openrouter");
  if (google) available.push("google");
  if (groq) available.push("groq");
  if (mistral) available.push("mistral");
  if (cloudflareOk) available.push("cloudflare");
  if (!available.length) {
    throw new Error(
      "Configure OPENROUTER_API_KEY, GOOGLE_AI_STUDIO_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY ou Cloudflare (token + account id) em .env.local",
    );
  }
  const order = providersForModel(available, opts.model);
  let lastError: unknown;
  for (const provider of order) {
    try {
      const completion: LlmCompletion = await runProvider(provider, {
        openrouter,
        google,
        groq,
        mistral,
        cloudflareToken,
        cloudflareAccountId,
        model: opts.model,
        messages: opts.messages,
        json: opts.json,
        fetchImpl: opts.fetchImpl,
      });
      recordCompletion(completion, opts.purpose ?? "ia");
      return completion.text;
    } catch (err) {
      lastError = err;
      console.error("[llm]", provider, err instanceof Error ? err.message : err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Nenhum provedor de IA respondeu.");
}

async function runProvider(
  provider: LlmProvider,
  opts: {
    openrouter: string;
    google: string;
    groq: string;
    mistral: string;
    cloudflareToken: string;
    cloudflareAccountId: string;
    model?: string;
    messages: ChatTurn[];
    json?: boolean;
    fetchImpl?: typeof fetch;
  },
): Promise<LlmCompletion> {
  if (provider === "openrouter") {
    return completeChat({
      apiKey: opts.openrouter,
      model: resolveModel(opts.model),
      messages: opts.messages,
      json: opts.json,
      fetchImpl: opts.fetchImpl,
    });
  }
  if (provider === "google") {
    return completeGemini({
      apiKey: opts.google,
      model: googleModelHint(opts.model),
      messages: opts.messages,
      json: opts.json,
      fetchImpl: opts.fetchImpl,
    });
  }
  if (provider === "groq") {
    return completeGroq({
      apiKey: opts.groq,
      model: modelHintForProvider("groq", opts.model),
      messages: opts.messages,
      json: opts.json,
      fetchImpl: opts.fetchImpl,
    });
  }
  if (provider === "mistral") {
    return completeMistral({
      apiKey: opts.mistral,
      model: modelHintForProvider("mistral", opts.model),
      messages: opts.messages,
      json: opts.json,
      fetchImpl: opts.fetchImpl,
    });
  }
  return completeCloudflare({
    apiToken: opts.cloudflareToken,
    accountId: opts.cloudflareAccountId,
    model: cloudflareModelHint(opts.model),
    messages: opts.messages,
    json: opts.json,
    fetchImpl: opts.fetchImpl,
  });
}

function googleModelHint(requested?: string): string | undefined {
  const id = requested?.trim() ?? "";
  if (!id) return undefined;
  const stripped = id.startsWith("google:") ? id.slice("google:".length) : id;
  if (stripped.startsWith("gemini-") && !stripped.includes("/")) return stripped;
  if (stripped.startsWith("gemini-")) return stripped;
  const mapped = stripped.match(/gemini-[\w.-]+/i);
  return mapped?.[0];
}

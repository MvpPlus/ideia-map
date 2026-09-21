import { completeGemini } from "@/lib/ai/gemini";
import { completeChat, resolveModel, type ChatTurn } from "@/lib/ai/openrouter";
import { loadGoogleAiKey, loadOpenRouterKey } from "@/lib/ai/persist-env";
import { recordCompletion } from "@/lib/ai/persist-usage";
import { nextProviderOrder, type LlmProvider } from "@/lib/ai/providers";
import { inferCatalogProvider } from "@/lib/ai/model-options";
import type { LlmCompletion } from "@/lib/ai/usage";

export function providersForModel(available: LlmProvider[], model?: string): LlmProvider[] {
  const order = nextProviderOrder(available);
  if (!model?.trim()) return order;
  const pref = inferCatalogProvider(model) === "google" ? "google" : "openrouter";
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
  const available: LlmProvider[] = [];
  if (openrouter) available.push("openrouter");
  if (google) available.push("google");
  if (!available.length) {
    throw new Error("Configure OPENROUTER_API_KEY ou GOOGLE_AI_STUDIO_API_KEY em .env.local");
  }
  const order = providersForModel(available, opts.model);
  let lastError: unknown;
  for (const provider of order) {
    try {
      const completion: LlmCompletion =
        provider === "openrouter"
          ? await completeChat({
              apiKey: openrouter,
              model: resolveModel(opts.model),
              messages: opts.messages,
              json: opts.json,
              fetchImpl: opts.fetchImpl,
            })
          : await completeGemini({
              apiKey: google,
              model: googleModelHint(opts.model),
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

function googleModelHint(requested?: string): string | undefined {
  const id = requested?.trim() ?? "";
  if (!id) return undefined;
  const stripped = id.startsWith("google:") ? id.slice("google:".length) : id;
  if (stripped.startsWith("gemini-") && !stripped.includes("/")) return stripped;
  if (stripped.startsWith("gemini-")) return stripped;
  const mapped = stripped.match(/gemini-[\w.-]+/i);
  return mapped?.[0];
}

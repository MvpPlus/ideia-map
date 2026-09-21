import type { ChatTurn } from "@/lib/ai/openrouter";
import { routeGoogleChain } from "@/lib/ai/providers";
import { tokensFromText, type LlmCompletion } from "@/lib/ai/usage";

export const GEMINI_GENERATE_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function shouldRetryGemini(message: string): boolean {
  return /json|mime|overloaded|unavailable|resource exhausted|quota|rate|429|503|500/i.test(message);
}

export const GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export function googleModelId(resourceName: string): string {
  return resourceName.replace(/^models\//, "").trim();
}

export function isGoogleChatModel(model: {
  name?: string;
  supportedGenerationMethods?: string[];
}): boolean {
  const id = googleModelId(model.name ?? "");
  const methods = model.supportedGenerationMethods ?? [];
  if (!id || !methods.includes("generateContent")) return false;
  if (!/^gemini-/i.test(id)) return false;
  return !/embedding|imagen|tts|aqa|veo|robotics/i.test(id);
}

export async function listGoogleModels(opts: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string; name: string }[]> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) return [];
  const fetchImpl = opts.fetchImpl ?? fetch;
  const collected: { id: string; name: string }[] = [];
  let pageToken = "";
  for (let page = 0; page < 6; page += 1) {
    const url = new URL(GEMINI_MODELS_URL);
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetchImpl(url.toString(), {
      headers: { "x-goog-api-key": apiKey },
    });
    const payload = (await response.json()) as {
      error?: { message?: string };
      models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[];
      nextPageToken?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Não foi possível listar modelos do Google AI Studio.");
    }
    for (const model of payload.models ?? []) {
      if (!isGoogleChatModel(model)) continue;
      const id = googleModelId(model.name ?? "");
      collected.push({ id, name: model.displayName?.trim() || id });
    }
    pageToken = payload.nextPageToken?.trim() ?? "";
    if (!pageToken) break;
  }
  const seen = new Set<string>();
  return collected.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export async function completeGemini(opts: {
  apiKey: string;
  model?: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<LlmCompletion> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) throw new Error("Configure GOOGLE_AI_STUDIO_API_KEY em .env.local");
  const chain = routeGoogleChain(opts.model);
  let lastError: unknown;
  for (const model of chain) {
    try {
      return await completeGeminiOnce({ ...opts, apiKey, model, json: opts.json !== false });
    } catch (err) {
      lastError = err;
      const text = err instanceof Error ? err.message : "";
      if (opts.json !== false && shouldRetryGemini(text)) {
        try {
          return await completeGeminiOnce({ ...opts, apiKey, model, json: false });
        } catch (retryErr) {
          lastError = retryErr;
          continue;
        }
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("O Google AI Studio recusou todos os modelos da rota.");
}

async function completeGeminiOnce(opts: {
  apiKey: string;
  model: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<LlmCompletion> {
  const system = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.4,
      ...(opts.json !== false ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const fetchImpl = opts.fetchImpl ?? fetch;
  const response = await fetchImpl(GEMINI_GENERATE_URL(opts.model), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  if (!response.ok) {
    const message = payload.error?.message ?? `Google AI Studio recusou (${response.status}).`;
    console.error("[gemini]", opts.model, message);
    throw new Error(message);
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Google AI Studio devolveu resposta vazia.");
  const promptTokens =
    payload.usageMetadata?.promptTokenCount ?? tokensFromText(`${system}\n${opts.messages.map((m) => m.content).join("\n")}`);
  const completionTokens = payload.usageMetadata?.candidatesTokenCount ?? tokensFromText(text);
  return {
    text,
    provider: "google",
    model: opts.model,
    promptTokens,
    completionTokens,
  };
}

import type { ChatTurn } from "@/lib/ai/openrouter";
import type { LlmProvider } from "@/lib/ai/providers";
import { tokensFromText, type LlmCompletion } from "@/lib/ai/usage";

export type OpenAiCompatibleOpts = {
  provider: LlmProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
  missingKeyMessage?: string;
};

function shouldRetryWithoutJson(message: string): boolean {
  return /json|response_format|overloaded|rate|quota|429|503|500|unavailable/i.test(message);
}

export async function completeOpenAiCompatible(opts: OpenAiCompatibleOpts): Promise<LlmCompletion> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) {
    throw new Error(opts.missingKeyMessage ?? `Configure a chave de ${opts.provider} em .env.local`);
  }
  try {
    return await completeOnce({ ...opts, apiKey, json: opts.json !== false });
  } catch (err) {
    const text = err instanceof Error ? err.message : "";
    if (opts.json !== false && shouldRetryWithoutJson(text)) {
      return completeOnce({ ...opts, apiKey, json: false });
    }
    throw err;
  }
}

async function completeOnce(
  opts: OpenAiCompatibleOpts & { apiKey: string; json: boolean },
): Promise<LlmCompletion> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: 0.4,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    const message = payload.error?.message ?? `${opts.provider} recusou (${response.status}).`;
    console.error(`[${opts.provider}]`, opts.model, message);
    throw new Error(message);
  }
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${opts.provider} devolveu resposta vazia.`);
  const promptTokens =
    payload.usage?.prompt_tokens ?? tokensFromText(opts.messages.map((m) => m.content).join("\n"));
  const completionTokens = payload.usage?.completion_tokens ?? tokensFromText(content);
  return {
    text: content,
    provider: opts.provider,
    model: payload.model?.trim() || opts.model,
    promptTokens,
    completionTokens,
  };
}

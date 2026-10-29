import { tokensFromText, type LlmCompletion } from "@/lib/ai/usage";
import { GEMINI_GENERATE_URL } from "@/lib/ai/gemini";
import { routeGoogleChain } from "@/lib/ai/providers";

export type VisionImage = {
  mimeType: string;
  base64: string;
};

export async function completeGeminiVision(opts: {
  apiKey: string;
  model?: string;
  system?: string;
  prompt: string;
  images: VisionImage[];
  json?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<LlmCompletion> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) throw new Error("Configure GOOGLE_AI_STUDIO_API_KEY em .env.local para analisar imagens.");
  if (!opts.images.length) throw new Error("Nenhuma imagem para análise.");
  const chain = routeGoogleChain(opts.model ?? "gemini-2.0-flash");
  let lastError: unknown;
  for (const model of chain) {
    try {
      return await once({ ...opts, apiKey, model, json: opts.json !== false });
    } catch (err) {
      lastError = err;
      const text = err instanceof Error ? err.message : "";
      if (opts.json !== false && /json|mime|quota|rate|429|503/i.test(text)) {
        try {
          return await once({ ...opts, apiKey, model, json: false });
        } catch (retryErr) {
          lastError = retryErr;
          continue;
        }
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Google AI Studio não analisou a imagem.");
}

async function once(opts: {
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
  images: VisionImage[];
  json: boolean;
  fetchImpl?: typeof fetch;
}): Promise<LlmCompletion> {
  const parts: Record<string, unknown>[] = [
    ...opts.images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    })),
    { text: opts.prompt },
  ];
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.4,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system?.trim()) body.systemInstruction = { parts: [{ text: opts.system.trim() }] };
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
    throw new Error(payload.error?.message ?? `Google AI Studio recusou visão (${response.status}).`);
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Google AI Studio devolveu resposta vazia na visão.");
  return {
    text,
    provider: "google",
    model: opts.model,
    promptTokens: payload.usageMetadata?.promptTokenCount ?? tokensFromText(opts.prompt),
    completionTokens: payload.usageMetadata?.candidatesTokenCount ?? tokensFromText(text),
  };
}

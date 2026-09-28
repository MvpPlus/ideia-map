import { extractJson } from "@/lib/ai/json";
import { isFreeModel } from "@/lib/ai/model-options";
import { loadOpenRouterKey } from "@/lib/ai/persist-env";
import { tokensFromText, type LlmCompletion } from "@/lib/ai/usage";

export type ChatTurn = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type PlanRequirement = {
  title: string;
  description: string;
  priority: "alta" | "média" | "baixa";
};

export type PlanScreen = {
  name: string;
  route: string;
  description: string;
  components: { name: string; actions: string[] }[];
};

export type GeneratedPlan = {
  requirements: PlanRequirement[];
  screens: PlanScreen[];
};

export type ChatReply = {
  reply: string;
  requirement: PlanRequirement | null;
};

export { extractJson };

export const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

const PRIORITIES = new Set(["alta", "média", "baixa"]);

function asPriority(value: unknown): PlanRequirement["priority"] {
  const text = String(value ?? "média");
  if (PRIORITIES.has(text)) return text as PlanRequirement["priority"];
  return "média";
}

function asRequirement(raw: unknown): PlanRequirement {
  const item = raw as Record<string, unknown>;
  return {
    title: String(item.title ?? "").trim() || "Requisito",
    description: String(item.description ?? "").trim(),
    priority: asPriority(item.priority),
  };
}

export function parsePlan(text: string): GeneratedPlan {
  const data = extractJson(text) as Record<string, unknown>;
  const requirements = Array.isArray(data.requirements) ? data.requirements.map(asRequirement) : [];
  const screens = Array.isArray(data.screens)
    ? data.screens.map((raw) => {
        const item = raw as Record<string, unknown>;
        const components = Array.isArray(item.components)
          ? item.components.map((c) => {
              const comp = c as Record<string, unknown>;
              const actions = Array.isArray(comp.actions)
                ? comp.actions.map((a) => String(a))
                : [];
              return { name: String(comp.name ?? "Componente"), actions };
            })
          : [];
        return {
          name: String(item.name ?? "").trim() || "Tela",
          route: String(item.route ?? "/").trim() || "/",
          description: String(item.description ?? "").trim(),
          components,
        };
      })
    : [];
  if (requirements.length < 1) throw new Error("O plano precisa de ao menos um requisito.");
  if (screens.length < 2) throw new Error("O plano precisa de ao menos duas telas.");
  return { requirements, screens };
}

export function parseChatReply(text: string): ChatReply {
  const data = extractJson(text) as Record<string, unknown>;
  const reply = String(data.reply ?? "").trim();
  if (!reply) throw new Error("A IA não devolveu uma resposta.");
  if (!data.requirement) return { reply, requirement: null };
  return { reply, requirement: asRequirement(data.requirement) };
}

export function serverApiKey(): string {
  return loadOpenRouterKey();
}

export function resolveModel(requested?: string): string {
  const candidate = requested?.trim() ?? "";
  if (!candidate || candidate.startsWith("openrouter/free-")) {
    return process.env.OPENROUTER_MODEL?.trim() || FREE_ROUTER_MODEL;
  }
  return candidate;
}

export const FREE_ROUTER_MODEL = "openrouter/free";

export function isFreeRouteModel(id: string): boolean {
  const model = id.trim();
  return model === FREE_ROUTER_MODEL || model.endsWith(":free");
}

export function serverModel(fallback?: string): string {
  return resolveModel(fallback);
}

export const OPENROUTER_MODELS_ARRAY_MAX = 3;
export const DEFAULT_ROUTE_MODELS = [
  FREE_ROUTER_MODEL,
  "google/gemma-4-31b-it:free",
  "qwen/qwen3.8-27b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

export function defaultFallbackModels(): string[] {
  const fromEnv = process.env.OPENROUTER_FALLBACK_MODELS?.split(",")
    .map((id) => id.trim())
    .filter(isFreeRouteModel);
  if (fromEnv?.length) return fromEnv.slice(0, 5);
  const single = process.env.OPENROUTER_FALLBACK_MODEL?.trim();
  if (single) {
    return [single, process.env.OPENROUTER_MODEL?.trim(), ...DEFAULT_ROUTE_MODELS].filter(
      (id): id is string => Boolean(id),
    );
  }
  return [
    process.env.OPENROUTER_MODEL?.trim(),
    ...DEFAULT_ROUTE_MODELS,
  ].filter((id): id is string => Boolean(id));
}

export function routeModelChain(primary: string, extra: string[] = defaultFallbackModels()): string[] {
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const [index, id] of [primary, ...extra].entries()) {
    const model = id.trim();
    if (!model || seen.has(model)) continue;
    if (index > 0 && !isFreeRouteModel(model)) continue;
    seen.add(model);
    chain.push(model);
    if (chain.length === 5) break;
  }
  return chain;
}

function shouldRetryWithoutJson(message: string): boolean {
  return /json|response_format|provider returned error|overloaded|no endpoints found|not support|rate-limited|rate limit/i.test(
    message,
  );
}

function shouldReroute(message: string): boolean {
  return /provider returned error|overloaded|no endpoints found|rate-limited|rate limit|temporarily/i.test(message);
}

export async function completeChat(opts: {
  apiKey: string;
  model: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
  fallbacks?: string[];
}): Promise<LlmCompletion> {
  const chain = routeModelChain(opts.model, opts.fallbacks ?? defaultFallbackModels());
  let lastError: unknown;
  for (const model of chain) {
    const rest = chain.filter((id) => id !== model);
    try {
      return await completeChatOnce({ ...opts, model, json: opts.json !== false, fallbacks: rest });
    } catch (err) {
      lastError = err;
      const text = err instanceof Error ? err.message : "";
      if (opts.json !== false && shouldRetryWithoutJson(text)) {
        try {
          return await completeChatOnce({ ...opts, model, json: false, fallbacks: rest });
        } catch (retryErr) {
          lastError = retryErr;
          const retryText = retryErr instanceof Error ? retryErr.message : "";
          if (!shouldReroute(retryText)) throw retryErr;
          continue;
        }
      }
      if (!shouldReroute(text)) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("OpenRouter recusou todos os modelos da rota.");
}

type OpenRouterErrorPayload = {
  error?: {
    message?: string;
    metadata?: { raw?: string; provider_name?: string };
  };
};

export function formatOpenRouterError(payload: OpenRouterErrorPayload, status: number): string {
  const err = payload.error;
  const parts = [err?.message, err?.metadata?.provider_name, err?.metadata?.raw].filter(
    (part): part is string => Boolean(part && String(part).trim()),
  );
  const unique = [...new Set(parts.map((part) => part.trim()))];
  const detail = unique.join(" — ") || `OpenRouter recusou a chamada (${status}).`;
  if (/provider returned error/i.test(detail)) {
    return `${detail}. O modelo gratuito pode estar fora ou recusar JSON; tente de novo ou escolha outro modelo no Admin.`;
  }
  return detail;
}

async function completeChatOnce(opts: {
  apiKey: string;
  model: string;
  messages: ChatTurn[];
  json?: boolean;
  fetchImpl?: typeof fetch;
  fallbacks?: string[];
}): Promise<LlmCompletion> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) throw new Error("Configure OPENROUTER_API_KEY em .env.local");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: 0.4,
    provider: { allow_fallbacks: true },
  };
  if (opts.fallbacks?.length) body.models = opts.fallbacks.slice(0, OPENROUTER_MODELS_ARRAY_MAX);
  if (opts.json !== false) body.response_format = { type: "json_object" };
  const response = await fetchImpl(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3001",
      "X-OpenRouter-Title": "IdeiaMap",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as OpenRouterErrorPayload & {
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    const formatted = formatOpenRouterError(payload, response.status);
    console.error("[openrouter]", opts.model, opts.json === false ? "sem-json" : "json", formatted);
    throw new Error(formatted);
  }
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenRouter devolveu resposta vazia.");
  const promptTokens = payload.usage?.prompt_tokens ?? tokensFromText(opts.messages.map((m) => m.content).join("\n"));
  const completionTokens = payload.usage?.completion_tokens ?? tokensFromText(content);
  return {
    text: content,
    provider: "openrouter",
    model: payload.model?.trim() || opts.model,
    promptTokens,
    completionTokens,
  };
}

export async function listModels(opts: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string; name: string; free: boolean }[]> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) throw new Error("Configure OPENROUTER_API_KEY em .env.local");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const response = await fetchImpl(OPENROUTER_MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = (await response.json()) as {
    data?: { id: string; name?: string; pricing?: { prompt?: string; completion?: string } }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Não foi possível listar modelos.");
  }
  return (payload.data ?? []).map((model) => ({
    id: model.id,
    name: model.name ?? model.id,
    free: isFreeModel(model),
  }));
}

export const PLAN_SYSTEM = `Você é o planejador do IdeiaMap. Responda APENAS um JSON com:
{"requirements":[{"title":"","description":"","priority":"alta|média|baixa"}],"screens":[{"name":"","route":"/","description":"","components":[{"name":"","actions":[""]}]}]}
Escreva em português. Pelo menos 3 requisitos e 3 telas. Rotas no estilo App Router. Sem markdown.
Se vier um PRD aprovado, ele manda: requisitos saem das funcionalidades (P0 = alta, P1 = média, P2 = baixa) e as telas cobrem os fluxos principais.`;

export function planUserContent(input: {
  name: string;
  description: string;
  referenceUrl?: string;
  prd?: string;
}): string {
  const lines = [`Nome: ${input.name}`, `Descrição: ${input.description}`];
  if (input.referenceUrl) {
    lines.push(`URL de referência (não crawleie; use só como contexto): ${input.referenceUrl}`);
  }
  if (input.prd?.trim()) lines.push("", "PRD aprovado:", input.prd.trim());
  return lines.join("\n");
}

export const CHAT_SYSTEM = `Você refina um planejamento de software no IdeiaMap. Responda APENAS JSON:
{"reply":"texto curto em português","requirement":null}
Se a mensagem pedir um requisito novo, preencha requirement com title, description e priority (alta|média|baixa). Caso contrário requirement é null. Sem markdown.`;

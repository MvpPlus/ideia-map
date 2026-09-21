import { completeChat, parseChatReply, parsePlan, resolveModel, routeModelChain } from "@/lib/ai/openrouter";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("specs/005-openrouter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-1 Sem chave", async () => {
    await expect(
      completeChat({
        apiKey: "  ",
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "oi" }],
      }),
    ).rejects.toThrow(/OPENROUTER_API_KEY/);
  });

  it("AC-2 Chamada", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{\"ok\":true}" } }] }),
    });
    await completeChat({
      apiKey: "sk-test",
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "oi" }],
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(String(init.body)) as { models?: string[] };
    if (body.models) expect(body.models.length).toBeLessThanOrEqual(3);
  });

  it("AC-3 Plano JSON", () => {
    expect(() => parsePlan("{}")).toThrow(/requisito/);
    const plan = parsePlan(
      JSON.stringify({
        requirements: [{ title: "Login", description: "Entrar com e-mail", priority: "alta" }],
        screens: [
          { name: "Entrada", route: "/", description: "Home", components: [] },
          { name: "Painel", route: "/app", description: "Lista", components: [] },
        ],
      }),
    );
    expect(plan.requirements).toHaveLength(1);
    expect(plan.screens).toHaveLength(2);
  });

  it("AC-4 Chat JSON", () => {
    const withReq = parseChatReply(
      JSON.stringify({
        reply: "Vou incluir lista de espera.",
        requirement: { title: "Lista de espera", description: "Fila quando lotar", priority: "média" },
      }),
    );
    expect(withReq.reply).toContain("espera");
    expect(withReq.requirement?.title).toBe("Lista de espera");
    const without = parseChatReply(JSON.stringify({ reply: "Só um comentário.", requirement: null }));
    expect(without.requirement).toBeNull();
  });

  it("AC-8 Falha do provedor", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({
          error: {
            message: "Provider returned error",
            metadata: { provider_name: "Google", raw: "The model is overloaded. Please try again later." },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
      });
    const { text } = await completeChat({
      apiKey: "sk-test",
      model: "google/gemini-2.0-flash-exp:free",
      messages: [{ role: "user", content: "oi" }],
      fetchImpl,
    });
    expect(text).toContain("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const second = JSON.parse(String((fetchImpl.mock.calls[1] as [string, RequestInit])[1].body));
    expect(second.response_format).toBeUndefined();
  });

  it("AC-9 Roteamento", async () => {
    const fail = {
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          message: "Provider returned error",
          metadata: { provider_name: "Decart", raw: "temporarily rate-limited upstream" },
        },
      }),
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"routed":true}' } }] }),
      });
    const { text } = await completeChat({
      apiKey: "sk-test",
      model: "z-ai/glm-5.2:free",
      messages: [{ role: "user", content: "oi" }],
      fetchImpl,
      fallbacks: ["openai/gpt-4o-mini"],
    });
    expect(text).toContain("routed");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const third = JSON.parse(String((fetchImpl.mock.calls[2] as [string, RequestInit])[1].body));
    expect(third.model).toBe("openai/gpt-4o-mini");
    const chain = routeModelChain("z-ai/glm-5.2:free");
    expect(chain[0]).toBe("z-ai/glm-5.2:free");
    expect(chain.length).toBe(5);
    const firstBody = JSON.parse(String((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body));
    expect((firstBody.models as string[] | undefined)?.length ?? 0).toBeLessThanOrEqual(3);
  });

  it("ignora modelo mock antigo", () => {
    expect(resolveModel("openrouter/free-chat")).toBe("openai/gpt-4o-mini");
    expect(resolveModel("anthropic/claude-3.5-sonnet")).toBe("anthropic/claude-3.5-sonnet");
  });
});

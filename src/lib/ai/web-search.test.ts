import { parseDuckDuckGoJson, searchTheWeb } from "@/lib/ai/web-search";
import { describe, expect, it } from "vitest";

describe("specs/008-pesquisa AC-5", () => {
  it("parseDuckDuckGoJson extrai tópicos", () => {
    const hits = parseDuckDuckGoJson({
      AbstractText: "Resumo do mercado",
      AbstractURL: "https://example.com",
      Heading: "Feira",
      RelatedTopics: [{ Text: "App Feira — pedidos online", FirstURL: "https://app.example" }],
    });
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]?.url).toBe("https://example.com");
  });

  it("searchTheWeb usa API DDG quando HTML retorna 403", async () => {
    const mockFetch = async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("html.duckduckgo.com")) {
        return new Response("blocked", { status: 403 });
      }
      if (url.includes("api.duckduckgo.com")) {
        return Response.json({
          AbstractText: "Mercado de classificados",
          AbstractURL: "https://example.com/market",
          Heading: "Classificados",
          RelatedTopics: [{ Text: "OLX — anúncios", FirstURL: "https://example.com/olx" }],
        });
      }
      throw new Error(`fetch inesperado: ${url}`);
    };
    const { hits, source } = await searchTheWeb("app classificados brasil", mockFetch as typeof fetch);
    expect(source).toBe("duckduckgo");
    expect(hits.length).toBeGreaterThan(0);
  });
});

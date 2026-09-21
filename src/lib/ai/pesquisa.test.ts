import { assertPublicHttpUrl, extractTextFromHtml } from "@/lib/ai/fetch-url";
import { parseAnalysis, parseCompetitive, parseDatabase, parsePersonas, parseWebFill } from "@/lib/ai/research";
import { buildWebSearchQuery, parseGoogleCse } from "@/lib/ai/web-search";
import { describe, expect, it } from "vitest";

describe("specs/008-pesquisa", () => {
  it("AC-1 URL pública", () => {
    expect(() => assertPublicHttpUrl("http://127.0.0.1/secret")).toThrow(/privado/i);
    expect(() => assertPublicHttpUrl("http://localhost/x")).toThrow(/privado/i);
    expect(() => assertPublicHttpUrl("ftp://example.com")).toThrow(/http/i);
    expect(assertPublicHttpUrl("https://example.com/a").host).toBe("example.com");
  });

  it("AC-2 Texto sem script", () => {
    const text = extractTextFromHtml(
      "<html><body><p>Preços</p><script>secretToken()</script></body></html>",
    );
    expect(text).toContain("Preços");
    expect(text).not.toMatch(/secretToken/);
  });

  it("AC-3 Prompt na síntese", () => {
    expect(parseAnalysis(JSON.stringify({ findings: [{ title: "Pricing", detail: "Há planos" }] })).findings).toHaveLength(1);
    expect(
      parseCompetitive(JSON.stringify({ competitors: [{ name: "A", url: "https://a.dev", notes: "SaaS" }] })).competitors[0]
        ?.name,
    ).toBe("A");
    expect(parsePersonas(JSON.stringify({ personas: [{ name: "Ana", job: "Feirante", stories: ["Entrar"], acceptance: ["Login"] }] })).personas).toHaveLength(1);
    expect(
      parseDatabase(
        JSON.stringify({
          tables: [{ name: "stalls", columns: [{ name: "id", type: "uuid", pk: true }], rls: "auth.uid()" }],
          notes: "RLS por dono",
        }),
      ).tables,
    ).toHaveLength(1);
    expect(
      parseWebFill(
        JSON.stringify({
          findings: [{ title: "Mercado", detail: "Há apps de feira" }],
          competitors: [{ name: "App Feira", url: "https://a.dev", notes: "Pedidos" }],
        }),
      ).competitors,
    ).toHaveLength(1);
  });

  it("AC-5 Busca na web", () => {
    const query = buildWebSearchQuery({
      name: "Lista da feira",
      description: "Pedidos da semana para feirantes",
      findings: [{ title: "Login do feirante" }],
    });
    expect(query).toMatch(/Lista da feira/);
    expect(query).toMatch(/feirantes/i);
    expect(query.length).toBeGreaterThan(10);
    const hits = parseGoogleCse({
      items: [{ title: "App Feira", link: "https://example.com", snippet: "Pedidos" }],
    });
    expect(hits[0]?.url).toBe("https://example.com");
  });
});

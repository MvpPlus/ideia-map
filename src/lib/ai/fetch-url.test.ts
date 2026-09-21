import {
  assertPublicHttpUrl,
  extractTextFromHtml,
  fetchPublicPage,
  publicFetchHeaders,
} from "@/lib/ai/fetch-url";
import { describe, expect, it } from "vitest";

describe("specs/008-pesquisa", () => {
  it("AC-1 recusa localhost", () => {
    expect(() => assertPublicHttpUrl("http://localhost/x")).toThrow(/privado/i);
  });

  it("AC-2 remove script do texto", () => {
    const text = extractTextFromHtml("<html><body><script>alert(1)</script><p>Olá</p></body></html>");
    expect(text).toContain("Olá");
    expect(text).not.toContain("alert");
  });

  it("coleta usa User-Agent de navegador", () => {
    const headers = publicFetchHeaders();
    expect(headers["User-Agent"]).toMatch(/Chrome/);
  });

  it("403 explica bloqueio do site de destino", async () => {
    const mockFetch = async () =>
      new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    await expect(fetchPublicPage("https://example.com", mockFetch)).rejects.toThrow(/403|bloqueou/i);
  });
});

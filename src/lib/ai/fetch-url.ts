import { load } from "cheerio";

export const FETCH_TIMEOUT_MS = 8000;
export const MAX_EXTRACT_CHARS = 12_000;

/** Sites costumam recusar UA genérico ou IP de datacenter (Vercel). */
export const PUBLIC_FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function publicFetchHeaders(): Record<string, string> {
  return {
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "User-Agent": PUBLIC_FETCH_USER_AGENT,
  };
}

function fetchStatusError(status: number): string {
  if (status === 403) {
    return (
      "O site bloqueou a coleta (403). Muitas páginas só abrem no navegador ou bloqueiam servidores " +
      "(Cloudflare, anti-bot). Tente outra URL pública ou use um site que permita leitura automatizada."
    );
  }
  if (status === 401) {
    return "A página exige login (401). Use uma URL pública, sem autenticação.";
  }
  return `A página recusou a coleta (${status}).`;
}

export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("URL inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Use http ou https.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    throw new Error("Host privado não é permitido.");
  }
  if (isPrivateIpv4(host) || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    throw new Error("Host privado não é permitido.");
  }
  return url;
}

function isPrivateIpv4(host: string): boolean {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function extractTextFromHtml(html: string): string {
  const $ = load(html);
  $("script, style, iframe, noscript, object, embed").remove();
  const text = $("body").text() || $.root().text();
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACT_CHARS);
}

export async function fetchPublicPage(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string; text: string }> {
  const url = assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: publicFetchHeaders(),
    });
    if (!response.ok) {
      throw new Error(fetchStatusError(response.status));
    }
    const html = await response.text();
    const text = extractTextFromHtml(html);
    if (!text) throw new Error("Não deu para extrair texto desta página.");
    return { url: url.toString(), text };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("A coleta passou de 8 segundos.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

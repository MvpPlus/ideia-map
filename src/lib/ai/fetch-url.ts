import { load } from "cheerio";

export const FETCH_TIMEOUT_MS = 8000;
export const MAX_EXTRACT_CHARS = 12_000;

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
      headers: { Accept: "text/html,text/plain;q=0.9", "User-Agent": "IdeiaMap/0.1" },
    });
    if (!response.ok) {
      throw new Error(`A página recusou a coleta (${response.status}).`);
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

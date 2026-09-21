import { extractTextFromHtml, publicFetchHeaders } from "@/lib/ai/fetch-url";
import { load } from "cheerio";

export type WebHit = {
  title: string;
  url: string;
  snippet: string;
};

export function buildWebSearchQuery(input: {
  name: string;
  description: string;
  findings?: { title: string }[];
}): string {
  const extra = (input.findings ?? [])
    .slice(0, 2)
    .map((item) => item.title.trim())
    .filter(Boolean)
    .join(" ");
  const query = [input.name.trim(), input.description.trim().slice(0, 140), extra, "app alternativas concorrentes"]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!query) throw new Error("Sem texto para buscar na web.");
  return query.slice(0, 220);
}

export function formatWebHits(hits: WebHit[]): string {
  return hits
    .map((hit) => `${hit.title}\n${hit.url}\n${hit.snippet}`)
    .join("\n\n")
    .slice(0, 10_000);
}

export function parseDuckDuckGoHtml(html: string): WebHit[] {
  const $ = load(html);
  const hits: WebHit[] = [];
  $("a.result__a").each((_, el) => {
    const title = $(el).text().trim();
    let url = $(el).attr("href") ?? "";
    const uddg = url.match(/[?&]uddg=([^&]+)/);
    if (uddg?.[1]) url = decodeURIComponent(uddg[1]);
    const snippet = $(el).closest(".result").find(".result__snippet").text().trim();
    if (title && url.startsWith("http")) hits.push({ title, url, snippet });
  });
  if (hits.length === 0) {
    const text = extractTextFromHtml(html);
    if (text) hits.push({ title: "Resultados", url: "https://duckduckgo.com", snippet: text.slice(0, 800) });
  }
  return hits.slice(0, 8);
}

type DuckFlatTopic = { Text?: string; FirstURL?: string };
type DuckGroupTopic = { Name?: string; Topics?: DuckFlatTopic[] };
type DuckTopic = DuckFlatTopic | DuckGroupTopic;

function isDuckGroupTopic(topic: DuckTopic): topic is DuckGroupTopic {
  return Array.isArray((topic as DuckGroupTopic).Topics);
}

export function parseDuckDuckGoJson(payload: {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: DuckTopic[];
}): WebHit[] {
  const hits: WebHit[] = [];
  const abstract = payload.AbstractText?.trim();
  const abstractUrl = payload.AbstractURL?.trim();
  if (abstract && abstractUrl?.startsWith("http")) {
    hits.push({
      title: payload.Heading?.trim() || "Resumo",
      url: abstractUrl,
      snippet: abstract.slice(0, 800),
    });
  }
  for (const topic of payload.RelatedTopics ?? []) {
    if (isDuckGroupTopic(topic)) {
      for (const sub of topic.Topics ?? []) {
        const text = sub.Text?.trim();
        const url = sub.FirstURL?.trim();
        if (text && url?.startsWith("http")) {
          hits.push({ title: text.slice(0, 120), url, snippet: text.slice(0, 800) });
        }
      }
      continue;
    }
    const text = topic.Text?.trim();
    const url = topic.FirstURL?.trim();
    if (text && url?.startsWith("http")) {
      hits.push({ title: text.slice(0, 120), url, snippet: text.slice(0, 800) });
    }
  }
  return hits.slice(0, 8);
}

export function parseGoogleCse(payload: {
  items?: { title?: string; link?: string; snippet?: string }[];
}): WebHit[] {
  return (payload.items ?? [])
    .map((item) => ({
      title: String(item.title ?? "").trim(),
      url: String(item.link ?? "").trim(),
      snippet: String(item.snippet ?? "").trim(),
    }))
    .filter((item) => item.title && item.url.startsWith("http"))
    .slice(0, 8);
}

export async function searchTheWeb(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ source: "google" | "duckduckgo"; hits: WebHit[] }> {
  const key = process.env.GOOGLE_API_KEY?.trim() || process.env.GOOGLE_SEARCH_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    if (key && cx) {
      const url = new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.set("key", key);
      url.searchParams.set("cx", cx);
      url.searchParams.set("q", query);
      url.searchParams.set("num", "8");
      url.searchParams.set("hl", "pt");
      const response = await fetchImpl(url.toString(), { signal: controller.signal });
      const payload = (await response.json()) as {
        error?: { message?: string };
        items?: { title?: string; link?: string; snippet?: string }[];
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "A busca do Google recusou a chamada.");
      }
      return { source: "google", hits: parseGoogleCse(payload) };
    }
    return await searchDuckDuckGo(query, fetchImpl, controller.signal);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("A busca na web passou de 8 segundos.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function searchDuckDuckGoApi(
  query: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<WebHit[]> {
  const api = new URL("https://api.duckduckgo.com/");
  api.searchParams.set("q", query);
  api.searchParams.set("format", "json");
  api.searchParams.set("no_html", "1");
  api.searchParams.set("skip_disambig", "1");
  const response = await fetchImpl(api.toString(), { signal, headers: publicFetchHeaders() });
  if (!response.ok) {
    throw new Error(`A busca na web recusou (${response.status}).`);
  }
  const payload = (await response.json()) as Parameters<typeof parseDuckDuckGoJson>[0];
  return parseDuckDuckGoJson(payload);
}

async function searchDuckDuckGo(
  query: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ source: "duckduckgo"; hits: WebHit[] }> {
  const ddg = new URL("https://html.duckduckgo.com/html/");
  ddg.searchParams.set("q", query);
  const response = await fetchImpl(ddg.toString(), {
    signal,
    headers: { ...publicFetchHeaders(), Accept: "text/html" },
  });
  if (response.ok) {
    const hits = parseDuckDuckGoHtml(await response.text());
    if (hits.length) return { source: "duckduckgo", hits };
  }

  const apiHits = await searchDuckDuckGoApi(query, fetchImpl, signal);
  if (apiHits.length) return { source: "duckduckgo", hits: apiHits };

  if (!response.ok) {
    const hint =
      response.status === 403
        ? " Configure GOOGLE_API_KEY e GOOGLE_CSE_ID na Vercel para busca mais estável."
        : "";
    throw new Error(`A busca na web recusou (${response.status}).${hint}`);
  }
  throw new Error("A busca não devolveu resultados utilizáveis.");
}

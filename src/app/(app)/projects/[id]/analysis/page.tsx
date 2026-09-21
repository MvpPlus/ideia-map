"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { requestAi } from "@/lib/ai/client";
import type { ParsedAnalysis, ParsedWebFill } from "@/lib/ai/research";
import type { WebHit } from "@/lib/ai/web-search";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { project, analysis, urlFetch } = useProjectBundle(id);
  const db = useAppStore((s) => s.db);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [url, setUrl] = useState(urlFetch?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hits, setHits] = useState<WebHit[]>([]);
  const [query, setQuery] = useState("");

  if (!project) return null;
  const current = project;

  async function collect() {
    setBusy(true);
    setError("");
    try {
      const page = await requestAi<{ url: string; text: string }>("/api/ai/fetch", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      dataRepository().saveUrlFetch(id, { url: page.url, text: page.text, error: null });
      refresh();
      toast("Texto da URL coletado no servidor.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha na coleta.";
      setError(message);
      dataRepository().saveUrlFetch(id, { url, text: "", error: message });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await requestAi<ParsedAnalysis & { kind: string }>("/api/ai/research", {
        method: "POST",
        body: JSON.stringify({
          kind: "analysis",
          model: db?.ai_settings.models.prompt,
          briefing: `${current.name}\n${current.description}`,
          pageText: dataRepository().listUrlFetches(id)[0]?.text,
        }),
      });
      dataRepository().saveAnalysis(id, result.findings);
      refresh();
      toast("Análise gerada com o modelo Prompt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na análise.");
    } finally {
      setBusy(false);
    }
  }

  async function searchWeb() {
    setBusy(true);
    setError("");
    try {
      const result = await requestAi<ParsedWebFill & { query: string; hits: WebHit[] }>("/api/ai/web-search", {
        method: "POST",
        body: JSON.stringify({
          name: current.name,
          description: current.description,
          findings: analysis?.findings,
          model: db?.ai_settings.models.prompt,
        }),
      });
      setHits(result.hits);
      setQuery(result.query);
      dataRepository().saveAnalysis(id, result.findings);
      dataRepository().saveCompetitors(id, result.competitors);
      refresh();
      toast("Busca na web preencheu a análise e o radar de mercado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na busca.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h2 className="display text-3xl">Análise de referência</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Colete uma URL ou busque na web a partir da ideia. O modelo Prompt preenche descobertas e o radar de mercado.
        </p>
      </div>
      <div className="card max-w-2xl space-y-3 p-5">
        <Field label="URL pública">
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void collect()} disabled={busy || !url.trim()}>
            Coletar URL
          </Button>
          <Button type="button" variant="ghost" onClick={() => void generate()} disabled={busy}>
            Gerar análise
          </Button>
        </div>
        {urlFetch?.error ? (
          <p className="text-sm text-marco">
            <span className="font-medium">Coleta URL:</span> {urlFetch.error}
          </p>
        ) : null}
        {urlFetch?.text ? <p className="text-xs text-mute">{urlFetch.text.slice(0, 280)}…</p> : null}
      </div>
      <div className="card max-w-2xl space-y-3 p-5">
        <h3 className="display text-xl">Busca na web</h3>
        <p className="text-sm text-mute">
          Monta uma query com o nome, a ideia e o que já existe na análise. No servidor usa a busca oficial do Google
          se as chaves estiverem configuradas; senão cai no DuckDuckGo. Não raspa a página do Google.
        </p>
        <Button type="button" onClick={() => void searchWeb()} disabled={busy}>
          Buscar e preencher análise + radar
        </Button>
        {query ? <p className="font-mono text-xs text-mute">Query: {query}</p> : null}
        {hits.length ? (
          <ul className="space-y-2 text-sm">
            {hits.slice(0, 5).map((hit) => (
              <li key={hit.url}>
                <a href={hit.url} className="text-trail underline" target="_blank" rel="noreferrer">
                  {hit.title}
                </a>
                <p className="text-xs text-mute">{hit.snippet}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? <p className="text-sm text-marco">{error}</p> : null}
      <ul className="grid max-w-3xl gap-3">
        {(analysis?.findings ?? []).map((item) => (
          <li key={item.title} className="card p-4">
            <h3 className="display text-xl">{item.title}</h3>
            <p className="mt-1 text-sm text-mute">{item.detail}</p>
          </li>
        ))}
      </ul>
      <AiWaitOverlay open={busy} title="Buscando referências no mercado" />
    </div>
  );
}

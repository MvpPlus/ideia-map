"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { Button } from "@/components/ui/button";
import { requestAi } from "@/lib/ai/client";
import type { ParsedCompetitive } from "@/lib/ai/research";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function CompetitivePage() {
  const { id } = useParams<{ id: string }>();
  const { project, competitors, urlFetch } = useProjectBundle(id);
  const db = useAppStore((s) => s.db);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!project) return null;
  const current = project;

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await requestAi<ParsedCompetitive>("/api/ai/research", {
        method: "POST",
        body: JSON.stringify({
          kind: "competitive",
          model: db?.ai_settings.models.prompt,
          briefing: `${current.name}\n${current.description}`,
          pageText: urlFetch?.text,
        }),
      });
      dataRepository().saveCompetitors(id, result.competitors);
      refresh();
      toast("Matriz gerada com o modelo Prompt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no competitivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl">Radar de mercado</h2>
          <p className="mt-2 max-w-2xl text-sm text-mute">
            Alternativas e produtos parecidos. A busca na web da Análise também preenche esta lista.
          </p>
        </div>
        <Button type="button" onClick={() => void generate()} disabled={busy}>
          Gerar matriz
        </Button>
      </div>
      {error ? <p className="text-sm text-marco">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-mute">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">URL</th>
              <th className="p-3">Notas</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="p-3">{row.name}</td>
                <td className="p-3 font-mono text-xs">{row.url || "—"}</td>
                <td className="p-3 text-mute">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AiWaitOverlay open={busy} title="Comparando o mercado" />
    </div>
  );
}

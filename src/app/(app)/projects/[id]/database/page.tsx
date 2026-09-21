"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { Button } from "@/components/ui/button";
import { requestAi } from "@/lib/ai/client";
import type { ParsedDatabase } from "@/lib/ai/research";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function DatabasePage() {
  const { id } = useParams<{ id: string }>();
  const { project, dataModel } = useProjectBundle(id);
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
      const result = await requestAi<ParsedDatabase>("/api/ai/research", {
        method: "POST",
        body: JSON.stringify({
          kind: "database",
          model: db?.ai_settings.models.prompt,
          briefing: `${current.name}\n${current.description}`,
        }),
      });
      dataRepository().saveDataModel(id, { tables: result.tables, notes: result.notes });
      refresh();
      toast("Schema gerado com o modelo Prompt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no modelo de dados.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl">Banco de dados</h2>
          <p className="mt-2 max-w-2xl text-sm text-mute">
            Tabelas, colunas e políticas RLS sugeridas. O adapter Supabase futuro deve cumprir o mesmo recorte.
          </p>
        </div>
        <Button type="button" onClick={() => void generate()} disabled={busy}>
          Gerar schema
        </Button>
      </div>
      {error ? <p className="text-sm text-marco">{error}</p> : null}
      {dataModel?.notes ? <p className="text-sm text-mute">{dataModel.notes}</p> : null}
      <div className="grid gap-4">
        {(dataModel?.tables ?? []).map((table) => (
          <section key={table.name} className="card p-5">
            <h3 className="display text-2xl">{table.name}</h3>
            <ul className="mt-3 font-mono text-xs text-mute">
              {table.columns.map((col) => (
                <li key={col.name}>
                  {col.name} {col.type}
                  {col.pk ? " · pk" : ""}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">RLS: {table.rls || "definir policy por user_id"}</p>
          </section>
        ))}
      </div>
      <AiWaitOverlay open={busy} title="Modelando tabelas e RLS" />
    </div>
  );
}

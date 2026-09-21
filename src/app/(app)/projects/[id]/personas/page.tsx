"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { Button } from "@/components/ui/button";
import { requestAi } from "@/lib/ai/client";
import type { ParsedPersonas } from "@/lib/ai/research";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function PersonasPage() {
  const { id } = useParams<{ id: string }>();
  const { project, personas } = useProjectBundle(id);
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
      const result = await requestAi<ParsedPersonas>("/api/ai/research", {
        method: "POST",
        body: JSON.stringify({
          kind: "personas",
          model: db?.ai_settings.models.prompt,
          briefing: `${current.name}\n${current.description}`,
        }),
      });
      dataRepository().savePersonas(id, result.personas);
      refresh();
      toast("Personas geradas com o modelo Prompt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha nas personas.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl">Personas e histórias</h2>
          <p className="mt-2 max-w-2xl text-sm text-mute">Síntese com o modelo Prompt a partir do briefing.</p>
        </div>
        <Button type="button" onClick={() => void generate()} disabled={busy}>
          Gerar personas
        </Button>
      </div>
      {error ? <p className="text-sm text-marco">{error}</p> : null}
      <ul className="grid gap-4 lg:grid-cols-2">
        {personas.map((persona) => (
          <li key={persona.id} className="card p-5">
            <h3 className="display text-2xl">{persona.name}</h3>
            <p className="mt-1 text-sm text-mute">{persona.job}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-mute">Histórias</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {persona.stories.map((story) => (
                <li key={story}>{story}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs uppercase tracking-wide text-mute">Aceite</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {persona.acceptance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <AiWaitOverlay open={busy} title="Desenhando personas" />
    </div>
  );
}

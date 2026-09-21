"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { requestAi } from "@/lib/ai/client";
import type { GeneratedPlan } from "@/lib/ai/openrouter";
import { dataRepository, isSupabaseMode } from "@/lib/data";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NewProjectPage() {
  const session = useAppStore((s) => s.session);
  const db = useAppStore((s) => s.db);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const { plan } = await requestAi<{ plan: GeneratedPlan }>("/api/ai/plan", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          referenceUrl: url,
          model: db?.ai_settings.models.prd,
        }),
      });
      const project = dataRepository().createProject(session.user.id, {
        name,
        description,
        referenceUrl: url,
        plan,
      });
      if (isSupabaseMode()) {
        await getSupabaseAdapter().persistNow();
      }
      refresh();
      toast("Planejamento gerado pela OpenRouter.");
      router.push(`/projects/${project.id}/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o plano.");
      toast("A OpenRouter não gerou o projeto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-2">
        <h1 className="display text-3xl lg:text-4xl">Novo projeto</h1>
        <p className="mt-2 text-sm text-mute">
          Nome e intenção vão para a OpenRouter (modelo PRD). A URL de referência é contexto; a coleta Cheerio fica em Análise.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="card space-y-4 p-5">
            <Field label="Nome do projeto">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Descrição">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
            </Field>
          </div>
          <div className="card space-y-4 p-5">
            <Field label="URL de referência (opcional)">
              <Input
                type="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
          </div>
          {error ? <p className="text-sm text-marco">{error}</p> : null}
          <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
            {busy ? "Gerando com a IA…" : "Criar projeto"}
          </Button>
        </form>
      </div>
      <AiWaitOverlay open={busy} />
    </AppShell>
  );
}

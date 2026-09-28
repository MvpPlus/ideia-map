"use client";

import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { dataRepository, isSupabaseMode } from "@/lib/data";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NewProjectPage() {
  const session = useAppStore((s) => s.session);
  const refresh = useAppStore((s) => s.refresh);
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
      const project = dataRepository().startProjectInterview(session.user.id, {
        name,
        description,
        referenceUrl: url,
      });
      if (isSupabaseMode()) {
        await getSupabaseAdapter().persistNow();
      }
      refresh();
      router.push(`/projects/${project.id}/interview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o projeto.");
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-2">
        <h1 className="display text-3xl lg:text-4xl">Novo projeto</h1>
        <p className="mt-2 text-sm text-mute">
          Conte a ideia do seu jeito. Antes de gerar qualquer coisa, um analista de produto (IA) faz uma entrevista curta
          e escreve o PRD para você revisar.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="card space-y-4 p-5">
            <Field label="Nome do projeto">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Ideia">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que é, para quem e qual problema resolve."
                required
              />
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
            {busy ? "Abrindo a entrevista…" : "Começar entrevista"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

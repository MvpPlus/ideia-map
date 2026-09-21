"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { requestAi } from "@/lib/ai/client";
import type { GeneratedPlan } from "@/lib/ai/openrouter";
import { dataRepository } from "@/lib/data";
import { REBUILD_CONFIRMATION } from "@/lib/projects/rebuild";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { FormEvent, useState } from "react";

export function EditProjectDetails({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const db = useAppStore((s) => s.db);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setConfirmOpen(true);
  }

  async function confirmRebuild() {
    setBusy(true);
    setError("");
    try {
      const { plan } = await requestAi<{ plan: GeneratedPlan }>("/api/ai/plan", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          model: db?.ai_settings.models.prd,
        }),
      });
      dataRepository().rebuildProjectFromPlan(project.id, {
        name: name.trim(),
        description: description.trim(),
        plan,
      });
      refresh();
      toast("Planejamento refeito. Pesquisa anterior foi limpa.");
      setConfirmOpen(false);
      onClose();
      window.location.assign(`/projects/${project.id}/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível refazer o plano.");
      toast("A IA não refez o planejamento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="card mt-6 space-y-4 p-4" onSubmit={onSubmit}>
        <p className="display text-xl">Editar detalhes</p>
        <p className="text-sm text-mute">
          Nome e descrição alimentam de novo o planejamento. Nada é gravado até você confirmar.
        </p>
        <Field label="Nome do projeto">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Descrição">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
        {error ? <p className="text-sm text-marco">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Salvar detalhes</Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
      {confirmOpen ? (
        <Modal title="Refazer o mapa?" onClose={() => { if (!busy) setConfirmOpen(false); }}>
          <p className="text-sm leading-6 text-mute">{REBUILD_CONFIRMATION}</p>
          {error ? <p className="mt-3 text-sm text-marco">{error}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="danger" disabled={busy} onClick={() => void confirmRebuild()}>
              {busy ? "Refazendo…" : "Sim, refazer tudo"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
          </div>
        </Modal>
      ) : null}
      <AiWaitOverlay open={busy} title="Refazendo o planejamento" />
    </>
  );
}

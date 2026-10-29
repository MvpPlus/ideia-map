"use client";

import { useOpenProjectEdit } from "@/components/projects/use-open-edit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fieldClass, Input, Textarea } from "@/components/ui/input";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import type { Requirement } from "@/lib/types";
import { uid } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { project, requirements, screens, latestVersion } = useProjectBundle(id);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [drafts, setDrafts] = useState<Requirement[]>(requirements);
  const openEdit = useOpenProjectEdit();

  useEffect(() => {
    setDrafts(requirements);
  }, [requirements]);

  if (!project) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="display text-2xl">Projeto não encontrado</p>
        <p className="mt-2 text-sm text-mute">
          Pode não ter sido salvo ainda ou você não tem acesso. Volte ao dashboard e tente de novo.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-trail underline">
          Ir para projetos
        </Link>
      </div>
    );
  }
  const current = project;

  function saveAll() {
    for (const req of drafts) dataRepository().upsertRequirement(req);
    const version = dataRepository().saveVersion(id);
    refresh();
    toast(`Versão ${version} registrada.`);
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-8">
      <section>
        <div className="flex flex-wrap gap-2">
          <Badge tone={current.status === "ready" ? "emerald" : "mute"}>{current.status}</Badge>
          <Badge tone="trail">versão {latestVersion || 0}</Badge>
        </div>
        <h2 className="display mt-3 text-3xl lg:text-4xl">{current.name}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">{current.description}</p>
        <Button className="mt-4" variant="ghost" onClick={() => void openEdit(current.id)}>
          Editar projeto
        </Button>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Requisitos", drafts.length],
            ["Telas", screens.length],
            ["Versão", latestVersion || 0],
            ["Status", current.status],
          ].map(([label, value]) => (
            <div key={label} className="card p-3">
              <p className="text-[11px] uppercase tracking-wide text-mute">{label}</p>
              <p className="display mt-1 text-xl">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm text-mute">Requisitos</h3>
          <Button
            variant="ghost"
            onClick={() =>
              setDrafts([
                ...drafts,
                {
                  id: uid("req"),
                  project_id: id,
                  title: "Novo requisito",
                  description: "",
                  priority: "média",
                },
              ])
            }
          >
            Adicionar
          </Button>
        </div>
        <ul className="space-y-3">
          {drafts.map((req, index) => (
            <li key={req.id} className="card p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                <Input
                  value={req.title}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[index] = { ...req, title: e.target.value };
                    setDrafts(next);
                  }}
                />
                <select
                  className={`${fieldClass} min-h-11 text-sm`}
                  value={req.priority}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[index] = { ...req, priority: e.target.value as Requirement["priority"] };
                    setDrafts(next);
                  }}
                >
                  <option value="alta">alta</option>
                  <option value="média">média</option>
                  <option value="baixa">baixa</option>
                </select>
              </div>
              <Textarea
                className="mt-2 min-h-20"
                value={req.description}
                onChange={(e) => {
                  const next = [...drafts];
                  next[index] = { ...req, description: e.target.value };
                  setDrafts(next);
                }}
              />
              <button
                type="button"
                className="mt-2 text-xs text-marco"
                onClick={() => setDrafts(drafts.filter((r) => r.id !== req.id))}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <Button onClick={saveAll}>Salvar</Button>
        <p className="text-xs text-mute">Última versão salva: {latestVersion || "nenhuma"} · Use a bolha Chat para conversar.</p>
      </section>
    </div>
  );
}

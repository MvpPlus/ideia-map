"use client";

import { EditProjectDetails } from "@/components/projects/edit-project-details";
import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fieldClass, Input, Textarea } from "@/components/ui/input";
import type { ChatReply } from "@/lib/ai/openrouter";
import { requestAi } from "@/lib/ai/client";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import type { Requirement } from "@/lib/types";
import { uid } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { project, requirements, screens, latestVersion, chat } = useProjectBundle(id);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const db = useAppStore((s) => s.db);
  const [drafts, setDrafts] = useState<Requirement[]>(requirements);
  const [message, setMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDrafts(requirements);
  }, [requirements]);

  if (!project) return null;
  const current = project;

  function saveAll() {
    for (const req of drafts) dataRepository().upsertRequirement(req);
    const version = dataRepository().saveVersion(id);
    refresh();
    toast(`Versão ${version} registrada.`);
  }

  async function sendChat() {
    if (!message.trim() || chatBusy) return;
    const text = message.trim();
    setChatBusy(true);
    try {
      const context = [
        `Nome: ${current.name}`,
        `Descrição: ${current.description}`,
        `Requisitos: ${drafts.map((r) => r.title).join("; ")}`,
        `Telas: ${screens.map((s) => `${s.name} (${s.route})`).join("; ")}`,
      ].join("\n");
      const ai = await requestAi<ChatReply>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          context,
          model: db?.ai_settings.models.chat,
        }),
      });
      dataRepository().sendChat(id, text, ai);
      setMessage("");
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chat indisponível.");
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="relative lg:pr-0">
      <div className="grid gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
        <div className="min-w-0 space-y-8">
          <section>
            <div className="flex flex-wrap gap-2">
              <Badge tone={current.status === "ready" ? "emerald" : "mute"}>{current.status}</Badge>
              <Badge tone="trail">versão {latestVersion || 0}</Badge>
            </div>
            <h2 className="display mt-3 text-3xl lg:text-4xl">{current.name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">{current.description}</p>
            <Button className="mt-4" variant="ghost" onClick={() => setEditing(true)}>
              Editar detalhes
            </Button>
            {editing ? (
              <EditProjectDetails project={current} onClose={() => setEditing(false)} />
            ) : null}
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
            <p className="mb-16 text-xs text-mute lg:mb-0">Última versão salva: {latestVersion || "nenhuma"}</p>
          </section>
        </div>
        <div className="hidden w-80 lg:block" />
      </div>

      <button
        type="button"
        className="fixed right-4 bottom-20 z-30 min-h-11 rounded-lg bg-gradient-to-r from-trail to-[#4F46E5] px-4 text-sm text-white lg:hidden"
        onClick={() => setChatOpen(true)}
      >
        Chat
      </button>

      <aside
        className={`z-40 flex-col border-line bg-paper/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md ${
          chatOpen ? "fixed inset-0 flex" : "hidden"
        } lg:fixed lg:top-16 lg:right-0 lg:bottom-0 lg:left-auto lg:flex lg:w-80 lg:border-l`}
      >
        <div className="flex items-center justify-between">
          <h3 className="display text-2xl">Chat</h3>
          <button type="button" className="min-h-11 text-sm text-mute lg:hidden" onClick={() => setChatOpen(false)}>
            Fechar
          </button>
        </div>
        <p className="mt-1 text-xs text-mute">OpenRouter responde em JSON e pode propor um requisito.</p>
        <ul className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
          {chat.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl px-3 py-2 ${item.role === "user" ? "bg-trail/15 text-ink" : "bg-panel text-mute"}`}
            >
              <span className="text-xs">{item.role === "user" ? "Você" : "Mapa"}</span>
              <p className="mt-1">{item.content}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendChat();
          }}
        >
          <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Peça um ajuste…" />
          <Button type="submit" className="shrink-0" disabled={chatBusy}>
            {chatBusy ? "…" : "Enviar"}
          </Button>
        </form>
      </aside>
      <AiWaitOverlay open={chatBusy} title="Pensando no seu mapa" />
    </div>
  );
}

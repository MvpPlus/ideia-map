"use client";

import { buildWireframeHtml } from "@/lib/screens/wireframe";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import type { Screen } from "@/lib/types";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function ScreensPage() {
  const { id } = useParams<{ id: string }>();
  const { screens } = useProjectBundle(id);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [selectedId, setSelectedId] = useState<string | null>(screens[0]?.id ?? null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRoute, setDraftRoute] = useState("/");
  const [draftDesc, setDraftDesc] = useState("");

  const selected = useMemo(
    () => screens.find((s) => s.id === selectedId) ?? screens[0],
    [screens, selectedId],
  );

  function saveScreen(screen: Screen) {
    dataRepository().updateScreen(screen);
    refresh();
    toast("Tela atualizada.");
  }

  async function copyHtml(html: string) {
    await navigator.clipboard.writeText(html);
    toast("HTML copiado.");
  }

  function downloadHtml(screen: Screen) {
    const blob = new Blob([buildWireframeHtml(screen)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${screen.name.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-w-0 overflow-x-hidden grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-paper lg:min-h-[calc(100vh-6.5rem)] lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm">Telas</h2>
          <Button variant="ghost" onClick={() => setCreating(true)}>
            Adicionar tela
          </Button>
        </div>
        <ul>
          {screens.map((screen) => (
            <li key={screen.id}>
              <button
                type="button"
                onClick={() => setSelectedId(screen.id)}
                className={`block w-full px-4 py-3 text-left ${selected?.id === screen.id ? "bg-trail/15" : "hover:bg-white/5"}`}
              >
                <span className="display text-lg">{screen.name}</span>
                <span className="mt-1 block font-mono text-xs text-mute">{screen.route}</span>
              </button>
            </li>
          ))}
        </ul>
        {creating ? (
          <form
            className="space-y-2 border-t border-line bg-panel/50 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const screen = dataRepository().createScreen(id, {
                name: draftName,
                route: draftRoute,
                description: draftDesc,
              });
              setCreating(false);
              setDraftName("");
              setDraftRoute("/");
              setDraftDesc("");
              setSelectedId(screen.id);
              refresh();
            }}
          >
            <Field label="Nome">
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} required />
            </Field>
            <Field label="Rota">
              <Input value={draftRoute} onChange={(e) => setDraftRoute(e.target.value)} required />
            </Field>
            <Field label="Descrição">
              <Input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit">Criar</Button>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}
      </aside>

      {selected ? (
        <ScreenEditor
          key={selected.id}
          screen={selected}
          viewport={viewport}
          onViewport={setViewport}
          onSave={saveScreen}
          onCopy={() => copyHtml(buildWireframeHtml(selected))}
          onDownload={() => downloadHtml(selected)}
        />
      ) : (
        <p className="p-8 text-sm text-mute">Nenhuma tela ainda.</p>
      )}
    </div>
  );
}

function ScreenEditor({
  screen,
  viewport,
  onViewport,
  onSave,
  onCopy,
  onDownload,
}: {
  screen: Screen;
  viewport: "desktop" | "mobile";
  onViewport: (v: "desktop" | "mobile") => void;
  onSave: (screen: Screen) => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const [draft, setDraft] = useState(screen);
  const html = useMemo(() => buildWireframeHtml(draft), [draft]);

  return (
    <div className="grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:p-6">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...draft, wireframe_html: html });
        }}
      >
        <Field label="Nome">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Rota">
          <Input value={draft.route} onChange={(e) => setDraft({ ...draft, route: e.target.value })} />
        </Field>
        <Field label="Descrição">
          <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </Field>
        <Field label="Componentes (um por linha: Nome | ação1; ação2)">
          <Textarea
            value={draft.components.map((c) => `${c.name} | ${c.actions.join("; ")}`).join("\n")}
            onChange={(e) =>
              setDraft({
                ...draft,
                components: e.target.value.split("\n").map((line) => {
                  const [name, actions] = line.split("|");
                  return {
                    name: (name ?? "").trim() || "Componente",
                    actions: (actions ?? "")
                      .split(";")
                      .map((a) => a.trim())
                      .filter(Boolean),
                  };
                }),
              })
            }
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Salvar tela</Button>
          <Button type="button" variant="ghost" onClick={onCopy}>
            Copiar HTML
          </Button>
          <Button type="button" variant="ghost" onClick={onDownload}>
            Download HTML
          </Button>
        </div>
      </form>
      <div>
        <div className="mb-3 flex gap-2">
          <Button variant={viewport === "desktop" ? "primary" : "ghost"} type="button" onClick={() => onViewport("desktop")}>
            Desktop
          </Button>
          <Button variant={viewport === "mobile" ? "primary" : "ghost"} type="button" onClick={() => onViewport("mobile")}>
            Mobile
          </Button>
        </div>
        <div className="flex justify-center rounded-2xl border border-line bg-[#070A10] p-3">
          <iframe
            title={`Prévia ${draft.name}`}
            srcDoc={html}
            className={`min-h-64 h-[50vh] max-w-full rounded-lg bg-[#070A10] lg:h-[640px] ${
              viewport === "mobile" ? "w-full max-w-[360px]" : "w-full"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

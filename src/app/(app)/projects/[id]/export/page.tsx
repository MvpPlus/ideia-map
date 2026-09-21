"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import type { ExportTarget } from "@/lib/types";
import JSZip from "jszip";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

const TARGETS: { id: ExportTarget; label: string }[] = [
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "antigravity", label: "Antigravity" },
  { id: "markdown", label: "Markdown genérico" },
];

function treeFor(targets: ExportTarget[]) {
  const files = ["README.md", "prd.md", "screens.md"];
  if (targets.includes("claude-code")) files.push("CLAUDE.md");
  if (targets.includes("cursor")) files.push(".cursor/rules/implement.md");
  if (targets.includes("codex")) files.push("AGENTS.md");
  if (targets.includes("antigravity")) files.push("ANTIGRAVITY.md");
  if (targets.includes("markdown")) files.push("PROMPT.md");
  return files;
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const { project, requirements, screens, latestVersion, exports } = useProjectBundle(id);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [targets, setTargets] = useState<ExportTarget[]>(["cursor", "markdown"]);
  const last = exports[0];
  const stale = Boolean(last && last.version_number < latestVersion);

  const files = useMemo(() => treeFor(targets), [targets]);

  const prompt = useMemo(() => {
    if (!project) return "";
    return `Implemente o produto "${project.name}".\n\n${project.description}\n\nRequisitos:\n${requirements
      .map((r) => `- ${r.title}: ${r.description}`)
      .join("\n")}\n\nTelas:\n${screens.map((s) => `- ${s.name} (${s.route})`).join("\n")}\n`;
  }, [project, requirements, screens]);

  function toggle(id: ExportTarget) {
    setTargets((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  async function generateZip(download: boolean) {
    if (!project || targets.length === 0) {
      toast("Selecione ao menos um destino.");
      return;
    }
    const record = dataRepository().generateExport(project.id, targets);
    refresh();
    const zip = new JSZip();
    zip.file("README.md", `# ${project.name}\n\n${project.description}\n`);
    zip.file("prd.md", prompt);
    zip.file(
      "screens.md",
      screens.map((s) => `## ${s.name}\nRota: ${s.route}\n${s.description}\n`).join("\n"),
    );
    for (const file of files) {
      if (file === "README.md" || file === "prd.md" || file === "screens.md") continue;
      zip.file(file, prompt);
    }
    if (download) {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-ideiamap.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast("ZIP baixado.");
    } else {
      toast(`Pacote gerado na versão ${record.version_number}.`);
    }
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 lg:px-8">
      <div>
        <h2 className="display text-3xl lg:text-4xl">Exportação</h2>
        <p className="mt-3">
          {stale || !last ? (
            <Badge tone="amber">O pacote não está alinhado à última versão salva.</Badge>
          ) : (
            <Badge tone="emerald">Pacote atualizado com a versão {last.version_number}.</Badge>
          )}
        </p>
      </div>
      <fieldset>
        <legend className="mb-3 text-sm text-mute">Destino</legend>
        <div className="flex flex-wrap gap-2">
          {TARGETS.map((target) => {
            const on = targets.includes(target.id);
            const recommended = target.id === "cursor";
            return (
              <button
                key={target.id}
                type="button"
                onClick={() => toggle(target.id)}
                className={`rounded-full border px-3 py-2 text-sm ${
                  on ? "border-trail bg-trail/20 text-ink" : "border-line bg-paper text-mute"
                }`}
              >
                {target.label}
                {recommended ? <span className="ml-1 text-[10px] text-emerald">recomendado</span> : null}
              </button>
            );
          })}
        </div>
      </fieldset>
      <section className="card p-4">
        <h3 className="text-sm text-mute">Árvore que será gerada</h3>
        <ul className="mt-2 font-mono text-sm text-mute">
          {files.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => generateZip(false)}>Gerar pacote</Button>
        <Button variant="ink" onClick={() => generateZip(true)}>
          Download ZIP
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(prompt);
            toast("Prompt inicial copiado.");
          }}
        >
          Copiar prompt inicial
        </Button>
      </div>
    </div>
  );
}

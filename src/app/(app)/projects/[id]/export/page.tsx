"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dataRepository, isSupabaseMode } from "@/lib/data";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import { buildExportFiles, exportTree, standalonePrompt } from "@/lib/export/package";
import { ARTIFACT_KINDS, ARTIFACT_META, missingArtifactSteps } from "@/lib/projects/artifacts";
import { requestArtifactMarkdown } from "@/lib/projects/request-artifact";
import Link from "next/link";
import { useAppStore, useProjectBundle } from "@/lib/store";
import type { ExportTarget } from "@/lib/types";
import JSZip from "jszip";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

async function persist() {
  if (isSupabaseMode()) await getSupabaseAdapter().persistNow();
}

const TARGETS: { id: ExportTarget; label: string }[] = [
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "antigravity", label: "Antigravity" },
  { id: "markdown", label: "Markdown genérico" },
];

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const { project, requirements, screens, latestVersion, exports, prd, artifacts } = useProjectBundle(id);
  const db = useAppStore((s) => s.db);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [targets, setTargets] = useState<ExportTarget[]>(["cursor", "markdown"]);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const last = exports[0];
  const stale = Boolean(last && last.version_number < latestVersion);
  const hasPrd = prd?.stage === "approved";
  const outside = hasPrd
    ? ARTIFACT_KINDS.filter((kind) => artifacts.find((a) => a.kind === kind)?.status !== "approved").map(
        (kind) => ARTIFACT_META[kind].label,
      )
    : [];

  const files = useMemo(
    () => (project ? exportTree({ project, requirements, screens, prd, artifacts, targets }) : []),
    [project, requirements, screens, prd, artifacts, targets],
  );

  const prompt = useMemo(
    () => (project ? standalonePrompt({ project, requirements, screens, prd, artifacts }) : ""),
    [project, requirements, screens, prd, artifacts],
  );

  function toggle(id: ExportTarget) {
    setTargets((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  async function completeDocs(projectId: string): Promise<boolean> {
    if (!prd || prd.stage !== "approved") return true;
    const repo = dataRepository();
    const steps = missingArtifactSteps(repo.listArtifacts(projectId));
    for (const [index, step] of steps.entries()) {
      const label = ARTIFACT_META[step.kind].label;
      setProgress(`${step.generate ? "Gerando" : "Aprovando"} ${label} — ${index + 1} de ${steps.length}`);
      try {
        if (step.generate) {
          const markdown = await requestArtifactMarkdown({
            projectId,
            kind: step.kind,
            prd: prd.prd_markdown,
            model: db?.ai_settings.models.prd,
          });
          repo.saveArtifactDraft(projectId, step.kind, markdown);
        }
        repo.approveArtifact(projectId, step.kind);
        await persist();
        refresh();
      } catch (err) {
        setError(`Não foi possível gerar o ${label}: ${err instanceof Error ? err.message : "erro desconhecido"}`);
        return false;
      }
    }
    return true;
  }

  async function generateZip(completeFirst: boolean) {
    if (!project || targets.length === 0) {
      toast("Selecione ao menos um destino.");
      return;
    }
    setError("");
    try {
      if (completeFirst && !(await completeDocs(project.id))) return;
    } finally {
      setProgress("");
    }
    const repo = dataRepository();
    const record = repo.generateExport(project.id, targets);
    await persist();
    refresh();
    const zip = new JSZip();
    const contents = buildExportFiles({
      project,
      requirements,
      screens,
      prd,
      artifacts: hasPrd ? repo.listArtifacts(project.id) : [],
      targets,
    });
    for (const [file, content] of Object.entries(contents)) zip.file(file, content);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-ideiamap.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Pacote da versão ${record.version_number} baixado.`);
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
            <li key={file}>
              {file}
              {file === "prd.md" ? (
                <span className="ml-2 font-sans text-xs">
                  {hasPrd ? "— PRD aprovado na entrevista" : "— montado de requisitos e telas"}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {outside.length ? (
          <p className="mt-3 text-xs text-mute">
            Faltam aprovar: {outside.join(", ")}. &ldquo;Gerar pacote&rdquo; gera os que faltam, aprova os em revisão e
            baixa o ZIP completo; &ldquo;Download ZIP&rdquo; baixa só o que já está aprovado.{" "}
            <Link href={`/projects/${project.id}/docs`} className="text-trail underline">
              Revisar em Documentos
            </Link>
          </p>
        ) : null}
      </section>
      {error ? (
        <div className="card border-marco/40 p-4">
          <p className="text-sm text-marco">{error}</p>
          <p className="mt-1 text-xs text-mute">Os documentos já gerados continuam aprovados. Clique em Gerar pacote para continuar.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void generateZip(true)} disabled={Boolean(progress)}>
          Gerar pacote
        </Button>
        <Button variant="ink" onClick={() => void generateZip(false)} disabled={Boolean(progress)}>
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
      <AiWaitOverlay open={Boolean(progress)} title={progress} />
    </div>
  );
}

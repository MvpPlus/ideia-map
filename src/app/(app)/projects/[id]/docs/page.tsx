"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { PrdView } from "@/components/projects/prd-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { dataRepository, isSupabaseMode } from "@/lib/data";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import { ARTIFACT_KINDS, ARTIFACT_META, canGenerateArtifact, nextArtifactKind } from "@/lib/projects/artifacts";
import { requestArtifactMarkdown } from "@/lib/projects/request-artifact";
import { useAppStore, useProjectBundle } from "@/lib/store";
import type { ArtifactKind } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

async function persist() {
  if (isSupabaseMode()) await getSupabaseAdapter().persistNow();
}

function message(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function DocsPage() {
  const { id } = useParams<{ id: string }>();
  const { project, prd, artifacts } = useProjectBundle(id);
  const db = useAppStore((s) => s.db);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [selected, setSelected] = useState<ArtifactKind | null>(null);
  const [generating, setGenerating] = useState<ArtifactKind | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [feedback, setFeedback] = useState("");
  const autoStarted = useRef(false);

  const approvedPrd = prd?.stage === "approved";
  const current = selected ?? nextArtifactKind(artifacts) ?? "plan";
  const artifact = artifacts.find((a) => a.kind === current);
  const upcoming = ARTIFACT_KINDS[ARTIFACT_KINDS.indexOf(current) + 1];

  async function generate(kind: ArtifactKind, feedbackText?: string) {
    if (!project || !prd) return;
    setSelected(kind);
    setGenerating(kind);
    setError("");
    try {
      const markdown = await requestArtifactMarkdown({
        projectId: id,
        kind,
        prd: prd.prd_markdown,
        model: db?.ai_settings.models.prd,
        feedback: feedbackText,
      });
      dataRepository().saveArtifactDraft(id, kind, markdown);
      await persist();
      refresh();
      setFeedback("");
      setEditing(false);
    } catch (err) {
      setError(message(err, `Não foi possível gerar o ${ARTIFACT_META[kind].label}.`));
    } finally {
      setGenerating(null);
    }
  }

  useEffect(() => {
    if (autoStarted.current || !project || !approvedPrd || artifacts.length) return;
    if (!new URLSearchParams(window.location.search).has("auto")) return;
    autoStarted.current = true;
    void Promise.resolve().then(() => generate("trd"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, approvedPrd, artifacts.length]);

  async function approve(kind: ArtifactKind) {
    try {
      const repo = dataRepository();
      repo.approveArtifact(id, kind);
      await persist();
      refresh();
      const fresh = repo.listArtifacts(id);
      const next = nextArtifactKind(fresh);
      if (!next) {
        setSelected(kind);
        toast("Todos os documentos aprovados. Eles já entram na exportação.");
        return;
      }
      toast(`${ARTIFACT_META[kind].label} aprovado.`);
      setSelected(next);
      if (!fresh.some((a) => a.kind === next)) await generate(next);
    } catch (err) {
      setError(message(err, "Não foi possível aprovar o documento."));
    }
  }

  async function saveEdit() {
    try {
      dataRepository().saveArtifactDraft(id, current, draftText);
      await persist();
      refresh();
      setEditing(false);
      toast("Documento atualizado.");
    } catch (err) {
      setError(message(err, "Não foi possível salvar o documento."));
    }
  }

  if (!project) return null;

  if (!approvedPrd) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="display text-2xl">Documentos técnicos nascem do PRD</p>
        <p className="mt-2 text-sm text-mute">
          {prd
            ? "Aprove o PRD para o analista escrever TRD, fluxo, UI/UX, backend e plano."
            : "Este projeto foi criado antes da entrevista de PRD, então não tem documentos técnicos."}
        </p>
        <Link href={`/projects/${id}/${prd ? "interview" : "overview"}`} className="mt-6 inline-block text-sm text-trail underline">
          {prd ? "Ir para o PRD" : "Ir para o planejamento"}
        </Link>
      </div>
    );
  }

  const busy = generating !== null;
  const allowed = canGenerateArtifact(artifacts, current);
  const previous = ARTIFACT_KINDS[ARTIFACT_KINDS.indexOf(current) - 1];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <header>
        <h2 className="display text-3xl lg:text-4xl">Documentos técnicos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
          O analista escreve um documento por vez a partir do PRD aprovado e dos anteriores. Revise, ajuste e aprove; cada
          aprovação gera o próximo. Só os aprovados entram na exportação.
        </p>
      </header>

      <ol className="grid gap-2 sm:grid-cols-5">
        {ARTIFACT_KINDS.map((kind, index) => {
          const doc = artifacts.find((a) => a.kind === kind);
          const reachable = Boolean(doc) || canGenerateArtifact(artifacts, kind);
          const active = kind === current;
          return (
            <li key={kind}>
              <button
                type="button"
                disabled={!reachable || busy}
                onClick={() => {
                  setSelected(kind);
                  setEditing(false);
                  setError("");
                }}
                className={`flex h-full w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left text-xs transition disabled:opacity-40 ${
                  active ? "border-trail bg-trail/15 text-ink" : "border-line bg-paper/70 text-mute hover:border-white/20"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide">Etapa {index + 1}</span>
                <span className="text-sm text-ink">{ARTIFACT_META[kind].label}</span>
                <span className={doc?.status === "approved" ? "text-emerald-300" : doc ? "text-[#c0c1ff]" : ""}>
                  {doc?.status === "approved" ? "✓ aprovado" : doc ? "em revisão" : reachable ? "a gerar" : "aguardando"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-marco/40 p-4">
          <p className="text-sm text-marco">{error}</p>
          {allowed && !artifact ? (
            <Button variant="ghost" onClick={() => void generate(current)} disabled={busy}>
              Tentar de novo
            </Button>
          ) : null}
        </div>
      ) : null}

      {!artifact ? (
        <section className="card space-y-3 p-5">
          <p className="display text-2xl">{ARTIFACT_META[current].label}</p>
          <p className="text-sm text-mute">{ARTIFACT_META[current].summary}</p>
          {allowed ? (
            <Button onClick={() => void generate(current)} disabled={busy}>
              Gerar {ARTIFACT_META[current].label}
            </Button>
          ) : (
            <p className="text-sm text-mute">
              Aprove o {previous ? ARTIFACT_META[previous].label : "documento anterior"} primeiro.
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={artifact.status === "approved" ? "emerald" : "trail"}>
              {artifact.status === "approved" ? "aprovado" : "em revisão"}
            </Badge>
            <span className="text-xs text-mute">vai para a exportação como {ARTIFACT_META[current].file}</span>
          </div>
          {artifact.status === "approved" ? (
            <p className="text-xs text-mute">
              Editar ou pedir ajuste devolve este documento e os seguintes para revisão.
            </p>
          ) : null}
          <section className="card p-5">
            {editing ? (
              <Textarea
                className="min-h-[60vh] font-mono text-xs"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
              />
            ) : (
              <PrdView markdown={artifact.markdown} />
            )}
          </section>
          {allowed ? (
            <>
              <section className="card space-y-3 p-5">
                <p className="text-sm text-mute">Pedir ajuste ao analista</p>
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (feedback.trim()) void generate(current, feedback.trim());
                  }}
                >
                  <Input
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ex.: use Supabase em vez de Firebase e inclua notificações push"
                    disabled={busy}
                  />
                  <Button type="submit" variant="ghost" className="shrink-0" disabled={busy || !feedback.trim()}>
                    Refazer
                  </Button>
                </form>
              </section>
              <div className="flex flex-wrap gap-3">
                {artifact.status === "draft" ? (
                  <Button onClick={() => void approve(current)} disabled={busy || editing}>
                    {upcoming ? `Aprovar e gerar ${ARTIFACT_META[upcoming].label}` : "Aprovar plano"}
                  </Button>
                ) : null}
                {editing ? (
                  <>
                    <Button variant="ghost" onClick={() => void saveEdit()} disabled={!draftText.trim()}>
                      Salvar texto
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setDraftText(artifact.markdown);
                      setEditing(true);
                    }}
                  >
                    Editar texto
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-mute">
              Aprove o {previous ? ARTIFACT_META[previous].label : "documento anterior"} para revisar este.
            </p>
          )}
        </>
      )}

      <AiWaitOverlay open={busy} title={generating ? `Escrevendo o ${ARTIFACT_META[generating].label}` : ""} />
    </div>
  );
}

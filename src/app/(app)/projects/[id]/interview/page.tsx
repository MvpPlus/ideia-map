"use client";

import { AiWaitOverlay } from "@/components/ai-wait/ai-wait-overlay";
import { PrdView } from "@/components/projects/prd-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { requestAi } from "@/lib/ai/client";
import {
  INTERVIEW_CATEGORIES,
  INTERVIEW_MAX_ANSWERS,
  INTERVIEW_MIN_ANSWERS,
  SKIP_ANSWER,
  canGeneratePrd,
  combineAnswer,
  interviewShouldFinish,
  projectBriefing,
  splitAnswer,
  type InterviewTurn,
} from "@/lib/ai/interview";
import type { InterviewQuestion } from "@/lib/types";
import type { GeneratedPlan } from "@/lib/ai/openrouter";
import { dataRepository, isSupabaseMode } from "@/lib/data";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import { useAppStore, useProjectBundle } from "@/lib/store";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

async function persist() {
  if (isSupabaseMode()) await getSupabaseAdapter().persistNow();
}

function message(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function AnswerChoices({
  question,
  busy,
  onAnswer,
  submitLabel = "Responder",
  footer,
}: {
  question: InterviewQuestion;
  busy: boolean;
  onAnswer: (text: string) => void;
  submitLabel?: string;
  footer?: ReactNode;
}) {
  const initial = splitAnswer(question.options, question.answer);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [text, setText] = useState(initial.text);
  const combined = combineAnswer(question.options, selected, text);

  function toggle(option: string) {
    setSelected((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

  return (
    <>
      <p className="text-xs text-mute">Marque uma ou mais opções e, se quiser, complete com suas palavras.</p>
      <div className="grid gap-2">
        {question.options.map((option) => {
          const recommended = option === question.recommended;
          const checked = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={busy}
              onClick={() => toggle(option)}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-4 py-2 text-left text-sm transition disabled:opacity-50 ${
                checked
                  ? "border-emerald-400/60 bg-emerald-400/10 text-ink"
                  : recommended
                    ? "border-trail/60 bg-trail/10 text-ink"
                    : "border-line bg-paper/70 text-ink hover:border-white/20"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                    checked ? "border-emerald-400 bg-emerald-400 text-paper" : "border-white/30"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                {option}
              </span>
              {recommended ? <Badge tone="trail">recomendada</Badge> : null}
            </button>
          );
        })}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (combined) onAnswer(combined);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Complete ou responda com suas palavras…"
          disabled={busy}
        />
        <Button type="submit" className="shrink-0" disabled={busy || !combined}>
          {submitLabel}
          {selected.length > 1 ? ` (${selected.length})` : ""}
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="text-xs text-mute underline disabled:opacity-50"
          disabled={busy}
          onClick={() => onAnswer(SKIP_ANSWER)}
        >
          Pular — decidir depois
        </button>
        {footer}
      </div>
    </>
  );
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { project, prd } = useProjectBundle(id);
  const db = useAppStore((s) => s.db);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [thinking, setThinking] = useState(false);
  const [generating, setGenerating] = useState<"" | "prd" | "plan">("");
  const [error, setError] = useState("");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [feedback, setFeedback] = useState("");
  const booted = useRef(false);
  const asking = useRef(false);

  const model = db?.ai_settings.models.prd;
  const questions = prd?.questions ?? [];
  const answered = questions.filter((q) => q.answer !== null);
  const pending = questions.find((q) => q.answer === null);
  const busy = thinking || generating !== "";

  async function generatePrd(feedbackText?: string) {
    if (!project) return;
    setGenerating("prd");
    setError("");
    try {
      const current = dataRepository().getProjectPrd(id);
      const { prd: markdown } = await requestAi<{ prd: string }>("/api/ai/prd", {
        method: "POST",
        body: JSON.stringify({
          briefing: projectBriefing(project),
          questions: current?.questions ?? [],
          currentPrd: feedbackText ? current?.prd_markdown : undefined,
          feedback: feedbackText,
          model,
        }),
      });
      dataRepository().savePrdDraft(id, markdown);
      await persist();
      refresh();
      setFeedback("");
      setEditing(false);
    } catch (err) {
      setError(message(err, "Não foi possível gerar o PRD."));
    } finally {
      setGenerating("");
    }
  }

  async function askNext() {
    if (!project || asking.current) return;
    asking.current = true;
    setThinking(true);
    setError("");
    try {
      const current = dataRepository().getProjectPrd(id);
      const { turn } = await requestAi<{ turn: InterviewTurn }>("/api/ai/interview", {
        method: "POST",
        body: JSON.stringify({ briefing: projectBriefing(project), questions: current?.questions ?? [], model }),
      });
      if (turn.done) {
        setThinking(false);
        await generatePrd();
        return;
      }
      if (dataRepository().getProjectPrd(id)?.questions.some((q) => q.answer === null)) return;
      dataRepository().addInterviewQuestion(id, turn.question);
      await persist();
      refresh();
    } catch (err) {
      setError(message(err, "O analista não conseguiu formular a próxima pergunta."));
    } finally {
      asking.current = false;
      setThinking(false);
    }
  }

  useEffect(() => {
    if (booted.current || !project || prd?.stage !== "interview" || pending) return;
    booted.current = true;
    void askNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, prd?.stage, Boolean(pending)]);

  async function answer(text: string) {
    if (!pending || busy) return;
    try {
      dataRepository().answerInterviewQuestion(id, pending.id, text);
      refresh();
      if (interviewShouldFinish(answered.length + 1)) {
        await generatePrd();
        return;
      }
      await askNext();
    } catch (err) {
      setError(message(err, "Não foi possível gravar a resposta."));
    }
  }

  async function adjust(questionId: string, text: string) {
    try {
      dataRepository().answerInterviewQuestion(id, questionId, text);
      await persist();
      refresh();
      setAdjusting(null);
      toast("Resposta ajustada. As próximas perguntas e o PRD usam a nova resposta.");
    } catch (err) {
      setError(message(err, "Não foi possível ajustar a resposta."));
    }
  }

  async function approve() {
    if (!project || !prd) return;
    setGenerating("plan");
    setError("");
    try {
      const { plan } = await requestAi<{ plan: GeneratedPlan }>("/api/ai/plan", {
        method: "POST",
        body: JSON.stringify({
          name: project.name,
          description: project.description,
          prd: prd.prd_markdown,
          model,
        }),
      });
      dataRepository().approvePrd(id, plan);
      await persist();
      refresh();
      toast("PRD aprovado. Requisitos e telas gerados; agora o analista escreve o TRD.");
      router.push(`/projects/${id}/docs?auto=1`);
    } catch (err) {
      setError(message(err, "Não foi possível gerar o planejamento."));
      setGenerating("");
    }
  }

  async function reopen() {
    try {
      dataRepository().reopenInterview(id);
      refresh();
      await askNext();
    } catch (err) {
      setError(message(err, "Não foi possível voltar à entrevista."));
    }
  }

  async function saveEdit() {
    try {
      dataRepository().savePrdDraft(id, draftText);
      await persist();
      refresh();
      setEditing(false);
      toast("PRD atualizado.");
    } catch (err) {
      setError(message(err, "Não foi possível salvar o PRD."));
    }
  }

  if (!project) return null;

  if (!prd) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="display text-2xl">Projeto sem entrevista</p>
        <p className="mt-2 text-sm text-mute">Este projeto foi criado antes da entrevista de PRD.</p>
        <Link href={`/projects/${id}/overview`} className="mt-6 inline-block text-sm text-trail underline">
          Ir para o planejamento
        </Link>
      </div>
    );
  }

  const errorBox = error ? (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-marco/40 p-4">
      <p className="text-sm text-marco">{error}</p>
      {prd.stage === "interview" && !pending ? (
        <Button variant="ghost" onClick={() => void askNext()} disabled={busy}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <header>
        <div className="flex flex-wrap gap-2">
          <Badge tone={prd.stage === "approved" ? "emerald" : "trail"}>
            {prd.stage === "interview" ? "entrevista" : prd.stage === "review" ? "revisão do PRD" : "PRD aprovado"}
          </Badge>
          <Badge>{answered.length} respostas</Badge>
        </div>
        <h2 className="display mt-3 text-3xl lg:text-4xl">
          {prd.stage === "interview" ? "Entrevista de produto" : prd.stage === "review" ? "Revise o PRD" : project.name}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
          {prd.stage === "interview"
            ? "Um analista sênior pergunta uma coisa por vez, sempre com uma sugestão. Marque uma ou mais opções, responda do seu jeito ou deixe para depois; dá para ajustar respostas anteriores."
            : prd.stage === "review"
              ? "Nada além do PRD foi gerado ainda. Ajuste o que precisar; requisitos e telas só nascem quando você aprovar."
              : "Este é o PRD aprovado que originou o planejamento."}
        </p>
      </header>

      {errorBox}

      {prd.stage === "interview" ? (
        <>
          {pending ? (
            <section className="card space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
                <span>
                  Pergunta {answered.length + 1} de no máximo {INTERVIEW_MAX_ANSWERS}
                </span>
                <span>·</span>
                <span className="text-[#c0c1ff]">{INTERVIEW_CATEGORIES[pending.category]}</span>
              </div>
              <p className="display text-2xl leading-snug">{pending.question}</p>
              {pending.why ? <p className="text-sm text-mute">Por que importa: {pending.why}</p> : null}
              <AnswerChoices key={pending.id} question={pending} busy={busy} onAnswer={(text) => void answer(text)} />
            </section>
          ) : thinking ? (
            <section className="card animate-pulse p-5 text-sm text-mute">
              O analista está pensando na próxima pergunta…
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => void generatePrd()} disabled={busy || !canGeneratePrd(answered.length)}>
              Gerar PRD agora
            </Button>
            {!canGeneratePrd(answered.length) ? (
              <span className="text-xs text-mute">Libera com {INTERVIEW_MIN_ANSWERS} respostas.</span>
            ) : null}
          </div>

          {answered.length ? (
            <section className="space-y-3">
              <h3 className="text-sm text-mute">Respostas até aqui</h3>
              <ol className="space-y-2">
                {answered.map((q, index) =>
                  adjusting === q.id ? (
                    <li key={q.id} className="card space-y-3 border-trail/40 p-4 text-sm">
                      <p className="text-mute">
                        {index + 1}. {q.question}
                      </p>
                      <AnswerChoices
                        question={q}
                        busy={busy}
                        submitLabel="Salvar"
                        onAnswer={(text) => void adjust(q.id, text)}
                        footer={
                          <button type="button" className="text-xs text-mute underline" onClick={() => setAdjusting(null)}>
                            Cancelar ajuste
                          </button>
                        }
                      />
                    </li>
                  ) : (
                    <li key={q.id} className="card flex items-start justify-between gap-3 p-3 text-sm">
                      <div>
                        <p className="text-mute">
                          {index + 1}. {q.question}
                        </p>
                        <p className="mt-1 text-ink">{q.answer}</p>
                      </div>
                      <Button variant="ghost" className="shrink-0" disabled={busy} onClick={() => setAdjusting(q.id)}>
                        Ajustar
                      </Button>
                    </li>
                  ),
                )}
              </ol>
            </section>
          ) : null}
        </>
      ) : null}

      {prd.stage === "review" ? (
        <>
          <section className="card p-5">
            {editing ? (
              <Textarea
                className="min-h-[60vh] font-mono text-xs"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
              />
            ) : (
              <PrdView markdown={prd.prd_markdown} />
            )}
          </section>
          <section className="card space-y-3 p-5">
            <p className="text-sm text-mute">Pedir ajuste ao analista</p>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (feedback.trim()) void generatePrd(feedback.trim());
              }}
            >
              <Input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex.: inclua login com Google e tire o pagamento do MVP"
                disabled={busy}
              />
              <Button type="submit" variant="ghost" className="shrink-0" disabled={busy || !feedback.trim()}>
                Refazer PRD
              </Button>
            </form>
          </section>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void approve()} disabled={busy || editing}>
              Aprovar PRD e gerar planejamento
            </Button>
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
                  setDraftText(prd.prd_markdown);
                  setEditing(true);
                }}
              >
                Editar texto
              </Button>
            )}
            <Button variant="ghost" onClick={() => void reopen()} disabled={busy || editing}>
              Voltar à entrevista
            </Button>
          </div>
        </>
      ) : null}

      {prd.stage === "approved" ? (
        <>
          <Button href={`/projects/${id}/docs`} variant="ghost">
            Documentos técnicos (TRD, fluxo, UI/UX, backend, plano)
          </Button>
          <section className="card p-5">
            <PrdView markdown={prd.prd_markdown} />
          </section>
        </>
      ) : null}

      <AiWaitOverlay
        open={generating !== ""}
        title={generating === "plan" ? "Gerando requisitos e telas do PRD" : "Escrevendo o PRD"}
      />
    </div>
  );
}

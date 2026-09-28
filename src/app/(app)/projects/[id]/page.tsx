"use client";

import { STATUS_COLOR } from "@/components/projects/journey-ui";
import { TrailMap } from "@/components/projects/trail-map";
import { Button } from "@/components/ui/button";
import { useProjectBundle, useProjectJourney } from "@/lib/store";
import { useParams } from "next/navigation";

export default function ProjectTrailPage() {
  const { id } = useParams<{ id: string }>();
  const { project } = useProjectBundle(id);
  const journey = useProjectJourney(id);
  if (!project) return null;

  const { next } = journey;
  const counted = journey.steps.filter((s) => s.status !== "skipped");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="min-w-0 max-w-2xl">
          <h1 className="display text-3xl leading-tight sm:text-4xl lg:text-5xl">{project.name}</h1>
          {project.description ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-mute">{project.description}</p>
          ) : null}
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-line bg-panel/70 p-4 sm:max-w-sm lg:w-80">
          <div className="flex items-baseline justify-between gap-3">
            <span className="display text-3xl tabular-nums">{journey.overall}%</span>
            <span className="text-sm text-mute">
              {journey.done} de {journey.total} etapas concluídas
            </span>
          </div>
          <div className="mt-3 flex gap-1" aria-hidden>
            {counted.map((step) => (
              <span key={step.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${step.percent}%`,
                    background: next?.id === step.id ? "var(--marco)" : STATUS_COLOR[step.status],
                  }}
                />
              </span>
            ))}
          </div>
          {next ? (
            <>
              <Button href={`/projects/${project.id}/${next.href}`} className="mt-4 w-full">
                Continuar: {next.label}
              </Button>
              <p className="mt-2 text-xs text-mute">{next.hint}</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm">Todas as etapas concluídas. Mudou algo? Gere o pacote de novo.</p>
              <Button href={`/projects/${project.id}/export`} variant="ghost" className="mt-3 w-full">
                Ir para Exportar
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="mt-10 lg:mt-14" aria-label="Trilha do projeto">
        <TrailMap journey={journey} projectId={project.id} />
      </section>
    </div>
  );
}

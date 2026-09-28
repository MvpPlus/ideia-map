import { isProjectLocked } from "@/lib/projects/prd-gate";
import type { ProjectArtifact, ProjectPrd } from "@/lib/types";

export type JourneyStepId = "prd" | "plan" | "research" | "screens" | "database" | "docs" | "export";
export type JourneyStatus = "done" | "doing" | "todo" | "locked" | "skipped";

export type JourneyLink = { href: string; label: string };

export type JourneyStep = {
  id: JourneyStepId;
  number: number;
  label: string;
  href: string;
  percent: number;
  status: JourneyStatus;
  hint: string;
  links?: JourneyLink[];
};

export type JourneyInput = {
  prd?: ProjectPrd;
  requirements: unknown[];
  latestVersion: number;
  analysis?: unknown;
  competitors: unknown[];
  personas: unknown[];
  screens: unknown[];
  dataModel?: { tables: unknown[] };
  artifacts: Pick<ProjectArtifact, "status">[];
  exports: unknown[];
};

export type Journey = {
  steps: JourneyStep[];
  overall: number;
  done: number;
  total: number;
  next: JourneyStep | null;
};

export const RESEARCH_LINKS: JourneyLink[] = [
  { href: "analysis", label: "Análise" },
  { href: "competitive", label: "Radar de mercado" },
  { href: "personas", label: "Personas" },
];

type Definition = {
  id: JourneyStepId;
  label: string;
  href: string;
  hint: string;
  percent: (input: JourneyInput) => number | null;
};

function prdPercent(prd: ProjectPrd | undefined): number | null {
  if (!prd) return null;
  if (prd.stage === "approved") return 100;
  if (prd.stage === "review") return 80;
  const answered = prd.questions.filter((q) => q.answer !== null).length;
  return Math.min(60, answered * 6);
}

const DEFINITIONS: Definition[] = [
  {
    id: "prd",
    label: "Entrevista e PRD",
    href: "interview",
    hint: "Responda a entrevista e aprove o PRD.",
    percent: (input) => prdPercent(input.prd),
  },
  {
    id: "plan",
    label: "Planejar",
    href: "overview",
    hint: "Revise e salve os requisitos.",
    percent: (input) => (!input.requirements.length ? 0 : input.latestVersion >= 2 ? 100 : 60),
  },
  {
    id: "research",
    label: "Pesquisa",
    href: "analysis",
    hint: "Análise, concorrentes e personas.",
    percent: (input) => {
      const done = [Boolean(input.analysis), input.competitors.length > 0, input.personas.length > 0];
      return Math.round((done.filter(Boolean).length / done.length) * 100);
    },
  },
  {
    id: "screens",
    label: "Telas",
    href: "screens",
    hint: "Veja e ajuste as telas do app.",
    percent: (input) => (input.screens.length ? 100 : 0),
  },
  {
    id: "database",
    label: "Banco",
    href: "database",
    hint: "Monte o modelo de dados.",
    percent: (input) => (input.dataModel?.tables.length ? 100 : 0),
  },
  {
    id: "docs",
    label: "Documentos técnicos",
    href: "docs",
    hint: "TRD, fluxo, UI/UX, backend e plano.",
    percent: (input) => {
      if (!input.prd) return null;
      const points = input.artifacts.reduce((sum, a) => sum + (a.status === "approved" ? 20 : 10), 0);
      return Math.min(100, points);
    },
  },
  {
    id: "export",
    label: "Exportar",
    href: "export",
    hint: "Baixe o pacote para a sua IDE.",
    percent: (input) => (input.exports.length ? 100 : 0),
  },
];

export function openWhileLocked(pathname: string, projectId: string): boolean {
  const base = `/projects/${projectId}`;
  return pathname === base || pathname === `${base}/interview`;
}

function statusFor(percent: number): JourneyStatus {
  if (percent >= 100) return "done";
  return percent > 0 ? "doing" : "todo";
}

export function projectJourney(input: JourneyInput): Journey {
  const locked = isProjectLocked(input.prd);
  const steps = DEFINITIONS.map((def, index): JourneyStep => {
    const base = { id: def.id, number: index + 1, label: def.label, href: def.href };
    const extra = def.id === "research" ? { links: RESEARCH_LINKS } : {};
    const percent = def.percent(input);
    if (percent === null) {
      return { ...base, ...extra, percent: 0, status: "skipped", hint: "Projeto criado antes da entrevista." };
    }
    if (locked && def.id !== "prd") {
      return { ...base, ...extra, percent: 0, status: "locked", hint: "Abre quando você aprovar o PRD." };
    }
    return { ...base, ...extra, percent, status: statusFor(percent), hint: def.hint };
  });
  const counted = steps.filter((s) => s.status !== "skipped");
  const total = counted.length;
  const overall = total ? Math.round(counted.reduce((sum, s) => sum + s.percent, 0) / total) : 0;
  return {
    steps,
    overall,
    done: counted.filter((s) => s.status === "done").length,
    total,
    next: steps.find((s) => s.status === "doing" || s.status === "todo") ?? null,
  };
}

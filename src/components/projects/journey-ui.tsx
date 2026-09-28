import type { JourneyStatus, JourneyStep } from "@/lib/projects/journey";

export const STATUS_LABEL: Record<JourneyStatus, string> = {
  done: "Concluída",
  doing: "Em andamento",
  todo: "A fazer",
  locked: "Bloqueada",
  skipped: "Não se aplica",
};

export const STATUS_COLOR: Record<JourneyStatus, string> = {
  done: "var(--emerald)",
  doing: "var(--trail)",
  todo: "var(--mute)",
  locked: "var(--muted)",
  skipped: "var(--muted)",
};

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Parada da trilha: anel com a porcentagem e o número (ou check/cadeado) no centro. */
export function StopNode({ step, current }: { step: JourneyStep; current: boolean }) {
  const dim = step.status === "locked" || step.status === "skipped";
  const color = current ? "var(--marco)" : STATUS_COLOR[step.status];
  return (
    <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center ${dim ? "opacity-60" : ""}`}>
      {current ? <span className="trail-pulse absolute inset-0 rounded-full bg-marco/30" aria-hidden /> : null}
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-14 w-14" aria-hidden>
        <circle cx="28" cy="28" r="27" fill={step.status === "done" ? "#0f2a24" : "var(--panel)"} />
        <circle cx="28" cy="28" r={RADIUS} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
        {step.percent > 0 ? (
          <circle
            cx="28"
            cy="28"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - step.percent / 100)}
            transform="rotate(-90 28 28)"
          />
        ) : null}
      </svg>
      <span className="display relative text-lg" style={{ color: step.status === "done" ? "var(--emerald)" : current ? "var(--marco)" : "var(--ink)" }}>
        {step.status === "done" ? (
          <CheckIcon className="h-6 w-6" />
        ) : step.status === "locked" ? (
          <LockIcon className="h-5 w-5 text-mute" />
        ) : (
          step.number
        )}
      </span>
    </span>
  );
}

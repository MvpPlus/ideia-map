import { STATUS_LABEL, StopNode } from "@/components/projects/journey-ui";
import type { Journey, JourneyStep } from "@/lib/projects/journey";
import Link from "next/link";

const COLS = 4;
const XS = [110, 370, 630, 890];
const CARD_H = 150;
const ROW_Y = [CARD_H + 36, CARD_H + 186];
const BOARD_H = ROW_Y[1]! + 36 + CARD_H;
const FINISH = { x: XS[0]!, y: ROW_Y[1]! };

type Point = { x: number; y: number };

function boardPoint(index: number): Point {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return { x: row % 2 === 0 ? XS[col]! : XS[COLS - 1 - col]!, y: ROW_Y[row] ?? ROW_Y[1]! };
}

function segment(a: Point, b: Point, index: number): string {
  if (a.y === b.y) {
    const dx = b.x - a.x;
    const wave = index % 2 ? 24 : -24;
    return `M ${a.x} ${a.y} C ${a.x + dx / 3} ${a.y + wave}, ${b.x - dx / 3} ${b.y - wave}, ${b.x} ${b.y}`;
  }
  return `M ${a.x} ${a.y} C 1000 ${a.y}, 1000 ${b.y}, ${b.x} ${b.y}`;
}

function Road({ d, traveled }: { d: string; traveled: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      vectorEffect="non-scaling-stroke"
      stroke={traveled ? "var(--trail)" : "rgba(148,163,184,0.35)"}
      strokeWidth={traveled ? 4 : 2.5}
      strokeDasharray={traveled ? undefined : "2 9"}
      strokeLinecap="round"
    />
  );
}

function stepHref(projectId: string, href: string) {
  return `/projects/${projectId}/${href}`;
}

function StepText({ step, current, align }: { step: JourneyStep; current: boolean; align: "center" | "left" }) {
  const centered = align === "center";
  return (
    <>
      {current ? (
        <span className="mb-1.5 inline-block rounded-full bg-marco/15 px-2 py-0.5 text-[11px] font-medium text-marco">
          Próximo passo
        </span>
      ) : null}
      <span className="display block text-base leading-tight text-ink">{step.label}</span>
      <span className={`mt-1 block text-[13px] leading-snug text-mute ${centered ? "line-clamp-2" : ""}`}>{step.hint}</span>
      <span className={`mt-1.5 flex items-center gap-2 text-xs ${centered ? "justify-center" : ""}`}>
        <span className={step.status === "done" ? "text-emerald" : current ? "text-marco" : "text-mute"}>
          {STATUS_LABEL[step.status]}
        </span>
        {step.status === "skipped" || step.status === "locked" ? null : (
          <span className="tabular-nums text-ink">{step.percent}%</span>
        )}
      </span>
    </>
  );
}

function StepLinks({ projectId, step, align }: { projectId: string; step: JourneyStep; align: "center" | "left" }) {
  if (!step.links || step.status === "locked") return null;
  return (
    <span className={`mt-2 flex flex-wrap gap-1.5 ${align === "center" ? "justify-center" : ""}`}>
      {step.links.map((link) => (
        <Link
          key={link.href}
          href={stepHref(projectId, link.href)}
          className="inline-flex min-h-8 items-center rounded-full border border-line bg-paper/60 px-2.5 text-xs text-mute hover:border-trail/50 hover:text-ink"
        >
          {link.label}
        </Link>
      ))}
    </span>
  );
}

function StopLink({
  projectId,
  step,
  className,
  children,
  hidden,
  style,
}: {
  projectId: string;
  step: JourneyStep;
  className: string;
  children: React.ReactNode;
  hidden?: boolean;
  style?: React.CSSProperties;
}) {
  if (step.status === "locked") {
    return (
      <span className={`${className} cursor-not-allowed`} style={style} aria-disabled="true" aria-hidden={hidden || undefined}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={stepHref(projectId, step.href)}
      className={`${className} rounded-xl`}
      style={style}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
    >
      {children}
    </Link>
  );
}

function FinishFlag({
  reached,
  className = "",
  style,
}: {
  reached: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`flex items-center gap-2 ${className}`} style={style}>
      <svg viewBox="0 0 24 24" className={`h-7 w-7 shrink-0 ${reached ? "text-emerald" : "text-mute"}`} aria-hidden>
        <path d="M6 21V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 4h11l-2.5 4L17 12H6" fill="currentColor" fillOpacity={reached ? 0.9 : 0.25} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className={`display text-sm ${reached ? "text-emerald" : "text-mute"}`}>Pronto para Desenvolvimento</span>
    </span>
  );
}

function Board({ journey, projectId }: { journey: Journey; projectId: string }) {
  const points = journey.steps.map((_, i) => boardPoint(i));
  const finished = journey.steps.at(-1)?.status === "done";
  return (
    <div className="relative hidden md:block" style={{ height: BOARD_H }}>
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 1000 ${BOARD_H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <Road d={`M 0 ${points[0]!.y} L ${points[0]!.x} ${points[0]!.y}`} traveled />
        {points.slice(1).map((point, i) => (
          <Road key={i} d={segment(points[i]!, point, i)} traveled={journey.steps[i]!.status === "done"} />
        ))}
        <Road d={segment(points.at(-1)!, FINISH, points.length)} traveled={finished} />
      </svg>

      {journey.steps.map((step, i) => {
        const point = points[i]!;
        const above = point.y === ROW_Y[0];
        const current = journey.next?.id === step.id;
        const left = `${point.x / 10}%`;
        return (
          <div key={step.id}>
            <StopLink
              projectId={projectId}
              step={step}
              hidden
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left, top: point.y }}
            >
              <StopNode step={step} current={current} />
            </StopLink>
            <div
              className={`absolute flex w-[22%] max-w-56 -translate-x-1/2 flex-col items-center text-center ${above ? "justify-end" : ""}`}
              style={{ left, top: above ? 0 : point.y + 36, height: CARD_H }}
            >
              <StopLink projectId={projectId} step={step} className="block px-2 py-1 hover:bg-white/[0.03]">
                <StepText step={step} current={current} align="center" />
              </StopLink>
              <StepLinks projectId={projectId} step={step} align="center" />
            </div>
          </div>
        );
      })}
      <FinishFlag
        reached={finished}
        className="absolute w-max max-w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-panel px-3 py-1.5 leading-tight"
        style={{ left: `${FINISH.x / 10}%`, top: FINISH.y }}
      />
    </div>
  );
}

function Vertical({ journey, projectId }: { journey: Journey; projectId: string }) {
  const offsets = [8, 30];
  return (
    <ol className="md:hidden">
      {journey.steps.map((step, i) => {
        const current = journey.next?.id === step.id;
        const x = offsets[i % 2]!;
        const isLast = i === journey.steps.length - 1;
        const endX = isLast ? 30 : offsets[(i + 1) % 2]! + 28;
        return (
          <li key={step.id} className="relative grid grid-cols-[88px_minmax(0,1fr)] pb-8">
            <svg
              className="absolute top-7 left-0 h-full w-[88px] overflow-visible"
              viewBox="0 0 88 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <Road
                d={`M ${x + 28} 0 C ${x + 28} 50, ${endX} 50, ${endX} 100`}
                traveled={step.status === "done"}
              />
            </svg>
            <StopLink
              projectId={projectId}
              step={step}
              hidden
              className="relative z-10 block self-start justify-self-start rounded-full"
              style={{ marginLeft: x }}
            >
              <StopNode step={step} current={current} />
            </StopLink>
            <div className="min-w-0 pt-1">
              <StopLink projectId={projectId} step={step} className="-mx-2 block px-2 py-1">
                <StepText step={step} current={current} align="left" />
              </StopLink>
              <StepLinks projectId={projectId} step={step} align="left" />
            </div>
          </li>
        );
      })}
      <li className="pl-4">
        <FinishFlag reached={journey.steps.at(-1)?.status === "done"} />
      </li>
    </ol>
  );
}

export function TrailMap({ journey, projectId }: { journey: Journey; projectId: string }) {
  return (
    <div>
      <Board journey={journey} projectId={projectId} />
      <Vertical journey={journey} projectId={projectId} />
    </div>
  );
}

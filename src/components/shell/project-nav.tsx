import { LockIcon } from "@/components/projects/journey-ui";
import { Logo } from "@/components/logo";
import { NavUserFooter } from "@/components/shell/nav-user-footer";
import { appNavItems } from "@/lib/nav/app-nav";
import type { Journey, JourneyStep } from "@/lib/projects/journey";
import type { User } from "@/lib/types";
import Link from "next/link";

function StepDot({ step, current }: { step: JourneyStep; current: boolean }) {
  if (step.status === "locked") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-panel text-muted">
        <LockIcon className="h-3 w-3" />
      </span>
    );
  }
  const tone = current
    ? "border-marco bg-marco shadow-[0_0_0_4px_rgba(245,158,11,0.18)]"
    : step.status === "done"
      ? "border-emerald bg-emerald"
      : step.status === "doing"
        ? "border-trail bg-trail/40"
        : step.status === "skipped"
          ? "border-dashed border-muted bg-panel"
          : "border-mute/60 bg-panel";
  return (
    <span className="flex h-5 w-5 items-center justify-center">
      <span className={`h-3 w-3 rounded-full border-2 ${tone}`} />
    </span>
  );
}

export function ProjectNav({
  projectId,
  projectName,
  journey,
  pathname,
  user,
  onNavigate,
  onLogout,
  logoId,
  onEditProject,
  editLocked,
}: {
  logoId: string;
  onEditProject: () => void;
  editLocked: boolean;
  projectId: string;
  projectName: string;
  journey: Journey;
  pathname: string;
  user: User;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const base = `/projects/${projectId}`;
  const rowClass = (active: boolean) =>
    `flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm ${active ? "bg-paper text-ink" : "text-mute hover:bg-white/[0.04] hover:text-ink"}`;

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-3">
        <Logo href="/dashboard" markId={logoId} />
      </div>
      <div className="mt-3 px-4">
        <Link href="/dashboard" onClick={onNavigate} className="text-xs text-mute hover:text-ink">
          Todos os projetos
        </Link>
        <p className="display mt-0.5 truncate text-lg leading-tight" title={projectName}>
          {projectName}
        </p>
      </div>

      <nav className="mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-4" aria-label="Etapas do projeto">
        <button
          type="button"
          onClick={onEditProject}
          disabled={editLocked}
          title={editLocked ? "A ideia se ajusta na entrevista até você aprovar o PRD." : undefined}
          aria-current={pathname === `${base}/edit` ? "page" : undefined}
          className={`mb-2 flex min-h-10 w-full items-center gap-3 rounded-lg border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
            pathname === `${base}/edit`
              ? "border-trail/50 bg-paper text-ink"
              : "border-line text-mute hover:border-white/20 hover:text-ink"
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path d="M4 16l1-4 8-8 3 3-8 8-4 1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M11.5 5.5l3 3" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span className="flex-1 text-left">Editar projeto</span>
        </button>
        <Link href={base} onClick={onNavigate} className={rowClass(pathname === base)} aria-current={pathname === base ? "page" : undefined}>
          <svg viewBox="0 0 20 20" className="h-5 w-5 text-trail" aria-hidden>
            <path d="M3 15c3 0 3-4 7-4s4-5 7-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 3.2" />
            <circle cx="3" cy="15" r="2" fill="currentColor" />
            <circle cx="17" cy="6" r="2" fill="currentColor" />
          </svg>
          <span className="flex-1">Trilha</span>
          <span className="tabular-nums text-xs text-mute">{journey.overall}%</span>
        </Link>

        <ol className="relative mt-2">
          <span className="absolute top-5 bottom-5 left-[17px] w-px bg-line" aria-hidden />
          {journey.steps.map((step) => {
            const href = `${base}/${step.href}`;
            const subActive = step.links?.some((l) => pathname === `${base}/${l.href}`) ?? false;
            const active = pathname === href || subActive;
            const current = journey.next?.id === step.id;
            const content = (
              <>
                <StepDot step={step} current={current} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="mr-1.5 tabular-nums text-muted">{step.number}</span>
                  {step.label}
                </span>
                {step.status === "locked" || step.status === "skipped" ? null : (
                  <span className={`tabular-nums text-xs ${step.status === "done" ? "text-emerald" : "text-mute"}`}>
                    {step.percent}%
                  </span>
                )}
              </>
            );
            return (
              <li key={step.id} className="relative">
                {step.status === "locked" ? (
                  <span className={`${rowClass(false)} cursor-not-allowed opacity-60`} title={step.hint} aria-disabled="true">
                    {content}
                  </span>
                ) : (
                  <Link href={step.links ? `${base}/${step.links[0]!.href}` : href} onClick={onNavigate} className={rowClass(active && !step.links)} aria-current={pathname === href ? "page" : undefined}>
                    {content}
                  </Link>
                )}
                {step.links && step.status !== "locked" ? (
                  <ul className="mb-1 ml-8 border-l border-line pl-2">
                    {step.links.map((link) => {
                      const linkHref = `${base}/${link.href}`;
                      const linkActive = pathname === linkHref;
                      return (
                        <li key={link.href}>
                          <Link
                            href={linkHref}
                            onClick={onNavigate}
                            aria-current={linkActive ? "page" : undefined}
                            className={`flex min-h-9 items-center rounded-lg px-2 text-[13px] ${linkActive ? "bg-paper text-ink" : "text-mute hover:text-ink"}`}
                          >
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <NavUserFooter
        user={user}
        links={appNavItems(user.role).filter((item) => item.href === "/profile" || item.href === "/admin")}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    </div>
  );
}

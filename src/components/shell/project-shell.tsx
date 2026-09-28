"use client";

import { useOpenProjectEdit } from "@/components/projects/use-open-edit";
import { ProjectNav } from "@/components/shell/project-nav";
import { SideShell } from "@/components/shell/side-shell";
import { openWhileLocked } from "@/lib/projects/journey";
import { isProjectLocked } from "@/lib/projects/prd-gate";
import { useAppStore, useProjectBundle, useProjectJourney } from "@/lib/store";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProjectShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const session = useAppStore((s) => s.session);
  const logout = useAppStore((s) => s.logout);
  const { project, prd } = useProjectBundle(params.id);
  const journey = useProjectJourney(params.id);
  const openEdit = useOpenProjectEdit();
  const locked = isProjectLocked(prd);
  const blocked = locked && !openWhileLocked(pathname, params.id);

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  useEffect(() => {
    if (project && blocked) router.replace(`/projects/${params.id}/interview`);
  }, [project, blocked, params.id, router]);

  if (!session) return null;

  if (!project) {
    return (
      <div className="p-8">
        <p>Projeto não encontrado.</p>
        <Link href="/dashboard" className="text-trail underline">
          Voltar aos projetos
        </Link>
      </div>
    );
  }

  return (
    <SideShell
      mobileTitle={project.name}
      mobileTitleHref={`/projects/${project.id}`}
      mobileBadge={
        <span className="rounded-full border border-line px-2 py-0.5 text-xs tabular-nums text-mute">{journey.overall}%</span>
      }
      nav={({ onNavigate, logoId }) => (
        <ProjectNav
          logoId={logoId}
          projectId={project.id}
          projectName={project.name}
          journey={journey}
          pathname={pathname}
          user={session.user}
          onNavigate={onNavigate}
          onLogout={() => {
            logout();
            router.push("/");
          }}
          editLocked={locked}
          onEditProject={() => {
            onNavigate?.();
            void openEdit(project.id);
          }}
        />
      )}
    >
      {blocked ? null : children}
    </SideShell>
  );
}

"use client";

import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjects } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { EditProjectDetails } from "@/components/projects/edit-project-details";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function statusTone(project: Project): "mute" | "emerald" | "amber" {
  if (project.is_archived) return "amber";
  if (project.status === "ready") return "emerald";
  return "mute";
}

export default function DashboardPage() {
  const projects = useProjects();
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [projects, query]);

  function run(action: () => void, message: string) {
    action();
    refresh();
    toast(message);
    setMenuId(null);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl py-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-3xl lg:text-4xl">Projetos</h1>
            <p className="mt-1 text-sm text-mute">Abra um mapa ou comece outro.</p>
          </div>
          <Button onClick={() => router.push("/projects/new")}>Novo projeto</Button>
        </div>
        <div className="sticky top-16 z-10 mt-6 bg-canvas/90 py-3 backdrop-blur-md">
          <Input
            placeholder="Buscar por nome ou descrição"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="grid gap-3">
          {filtered.length === 0 ? (
            <li className="card px-4 py-10 text-sm text-mute">
              Nenhum projeto neste filtro. Crie o primeiro mapa.
            </li>
          ) : (
            filtered.map((project) => (
              <li
                key={project.id}
                className="card relative grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 transition hover:border-trail/50"
              >
                <Link href={`/projects/${project.id}/overview`} className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="display text-xl">{project.name}</p>
                    <Badge tone={statusTone(project)}>
                      {project.is_archived ? "arquivado" : project.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-mute">{project.description}</p>
                  <p className="mt-2 text-xs text-mute">{formatDate(project.updated_at)}</p>
                </Link>
                <Button
                  variant="ghost"
                  aria-expanded={menuId === project.id}
                  onClick={() => setMenuId(menuId === project.id ? null : project.id)}
                >
                  Opções
                </Button>
                {menuId === project.id ? (
                  <div className="absolute top-full right-3 z-20 mt-1 grid w-44 rounded-xl border border-line bg-paper text-sm shadow-xl">
                    <button className="min-h-11 px-3 py-2 text-left hover:bg-white/5" onClick={() => setEditing(project)}>
                      Editar detalhes
                    </button>
                    <button
                      className="min-h-11 px-3 py-2 text-left hover:bg-white/5"
                      onClick={() =>
                        run(() => {
                          const copy = dataRepository().duplicateProject(project.id);
                          router.push(`/projects/${copy.id}/overview`);
                        }, "Projeto duplicado.")
                      }
                    >
                      Duplicar
                    </button>
                    <button
                      className="min-h-11 px-3 py-2 text-left hover:bg-white/5"
                      onClick={() => run(() => dataRepository().archiveProject(project.id), "Projeto arquivado.")}
                    >
                      Arquivar
                    </button>
                    <button
                      className="min-h-11 px-3 py-2 text-left text-marco hover:bg-white/5"
                      onClick={() => run(() => dataRepository().deleteProject(project.id), "Projeto excluído.")}
                    >
                      Excluir
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
        {editing ? (
          <EditProjectDetails
            project={editing}
            onClose={() => {
              setEditing(null);
              setMenuId(null);
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

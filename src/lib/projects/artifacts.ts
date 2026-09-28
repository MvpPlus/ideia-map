import type { ArtifactKind, ProjectArtifact } from "@/lib/types";

export const ARTIFACT_KINDS: ArtifactKind[] = ["trd", "flow", "design", "backend", "plan"];

export const ARTIFACT_META: Record<ArtifactKind, { label: string; file: string; summary: string }> = {
  trd: {
    label: "TRD",
    file: "trd.md",
    summary: "Stack, arquitetura, integrações, requisitos não funcionais, segurança e riscos técnicos.",
  },
  flow: {
    label: "Fluxo do sistema",
    file: "flows.md",
    summary: "Mapa de navegação entre as telas em diagrama, jornadas e estados de erro.",
  },
  design: {
    label: "UI/UX Design",
    file: "design.md",
    summary: "Direção visual, cores e tipografia, componentes, estados, acessibilidade e responsividade.",
  },
  backend: {
    label: "Esquema backend",
    file: "backend.md",
    summary: "Modelo de dados, SQL com RLS, endpoints e regras de acesso.",
  },
  plan: {
    label: "Plano de implementação",
    file: "plan.md",
    summary: "Fases, tarefas em checklist, dependências e marcos.",
  },
};

function approved(artifacts: Pick<ProjectArtifact, "kind" | "status">[], kind: ArtifactKind): boolean {
  return artifacts.some((a) => a.kind === kind && a.status === "approved");
}

export function nextArtifactKind(artifacts: Pick<ProjectArtifact, "kind" | "status">[]): ArtifactKind | null {
  return ARTIFACT_KINDS.find((kind) => !approved(artifacts, kind)) ?? null;
}

export function missingArtifactSteps(
  artifacts: Pick<ProjectArtifact, "kind" | "status">[],
): { kind: ArtifactKind; generate: boolean }[] {
  return ARTIFACT_KINDS.filter((kind) => !approved(artifacts, kind)).map((kind) => ({
    kind,
    generate: !artifacts.some((a) => a.kind === kind),
  }));
}

export function canGenerateArtifact(artifacts: Pick<ProjectArtifact, "kind" | "status">[], kind: ArtifactKind): boolean {
  return ARTIFACT_KINDS.slice(0, ARTIFACT_KINDS.indexOf(kind)).every((before) => approved(artifacts, before));
}

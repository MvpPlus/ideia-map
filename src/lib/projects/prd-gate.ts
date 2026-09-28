import type { ProjectPrd } from "@/lib/types";

/** Projeto sem registro de PRD é anterior à spec 014 e fica liberado. */
export function isProjectLocked(prd: ProjectPrd | undefined): boolean {
  return Boolean(prd && prd.stage !== "approved");
}

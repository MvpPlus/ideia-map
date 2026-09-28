import { ARTIFACT_KINDS, canGenerateArtifact, missingArtifactSteps, nextArtifactKind } from "@/lib/projects/artifacts";
import type { ArtifactKind, ProjectArtifact } from "@/lib/types";
import { describe, expect, it } from "vitest";

function doc(kind: ArtifactKind, status: ProjectArtifact["status"]): ProjectArtifact {
  return { id: kind, project_id: "p", kind, markdown: `# ${kind}`, status, approved_at: null, updated_at: "" };
}

describe("specs/015-documentos-tecnicos", () => {
  it("AC-1 A cadeia segue TRD, fluxo, UI/UX, backend e plano", () => {
    expect(ARTIFACT_KINDS).toEqual(["trd", "flow", "design", "backend", "plan"]);
  });

  it("AC-1 Próximo documento é o primeiro ainda não aprovado", () => {
    expect(nextArtifactKind([])).toBe("trd");
    expect(nextArtifactKind([doc("trd", "draft")])).toBe("trd");
    expect(nextArtifactKind([doc("trd", "approved")])).toBe("flow");
    expect(nextArtifactKind(ARTIFACT_KINDS.map((k) => doc(k, "approved")))).toBeNull();
  });

  it("AC-8 Gerar pacote gera os que faltam e aprova os em revisão, na ordem", () => {
    expect(missingArtifactSteps([doc("trd", "approved"), doc("flow", "draft")])).toEqual([
      { kind: "flow", generate: false },
      { kind: "design", generate: true },
      { kind: "backend", generate: true },
      { kind: "plan", generate: true },
    ]);
    expect(missingArtifactSteps([])).toHaveLength(5);
    expect(missingArtifactSteps(ARTIFACT_KINDS.map((k) => doc(k, "approved")))).toEqual([]);
  });

  it("AC-1 Só gera um documento com os anteriores aprovados", () => {
    expect(canGenerateArtifact([], "trd")).toBe(true);
    expect(canGenerateArtifact([], "flow")).toBe(false);
    expect(canGenerateArtifact([doc("trd", "draft")], "flow")).toBe(false);
    expect(canGenerateArtifact([doc("trd", "approved")], "flow")).toBe(true);
    expect(canGenerateArtifact([doc("trd", "approved"), doc("flow", "approved")], "backend")).toBe(false);
  });
});

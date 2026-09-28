import { buildArtifactMessages, generateArtifact } from "@/lib/ai/artifacts";
import { completeLlm } from "@/lib/ai/complete";
import { resolveModel } from "@/lib/ai/openrouter";
import { ARTIFACT_KINDS } from "@/lib/projects/artifacts";
import type { ArtifactKind, ProjectArtifact, Requirement, Screen } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: string;
      prd?: string;
      artifacts?: Pick<ProjectArtifact, "kind" | "status" | "markdown">[];
      screens?: Pick<Screen, "name" | "route" | "description" | "components">[];
      requirements?: Pick<Requirement, "title" | "description" | "priority">[];
      current?: string;
      feedback?: string;
      model?: string;
    };
    const kind = body.kind as ArtifactKind;
    if (!ARTIFACT_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Documento desconhecido." }, { status: 400 });
    }
    const prd = body.prd?.trim() ?? "";
    if (!prd) {
      return NextResponse.json({ error: "Aprove o PRD antes de gerar os documentos técnicos." }, { status: 400 });
    }
    const messages = buildArtifactMessages({
      kind,
      prd,
      artifacts: Array.isArray(body.artifacts) ? body.artifacts : [],
      screens: (Array.isArray(body.screens) ? body.screens : []).map((s) => ({
        ...s,
        components: Array.isArray(s.components) ? s.components : [],
      })),
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      current: body.current,
      feedback: body.feedback,
    });
    const markdown = await generateArtifact(kind, (repair) =>
      completeLlm({
        model: resolveModel(body.model),
        purpose: `doc-${kind}`,
        messages: [...messages, ...repair],
        json: false,
      }),
    );
    return NextResponse.json({ markdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao gerar o documento.";
    const status = /API_KEY|AI_STUDIO/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

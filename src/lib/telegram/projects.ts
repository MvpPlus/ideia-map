import { completeLlm } from "@/lib/ai/complete";
import { buildArtifactMessages, generateArtifact } from "@/lib/ai/artifacts";
import { isSupabaseMode } from "@/lib/data";
import { nextArtifactKind } from "@/lib/projects/artifacts";
import { publicSupabaseEnv } from "@/lib/supabase/env";
import { openTelegramAdapter } from "@/lib/telegram/server-db";
import type {
  ArtifactKind,
  Project,
  ProjectArtifact,
  ProjectPrd,
  Requirement,
  Screen,
  Session,
} from "@/lib/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function mockSession(userId: string, email: string, name: string): Session {
  return {
    user: {
      id: userId,
      email,
      name,
      role: email === "admin@ideiamap.dev" ? "admin" : "user",
      preferences: { locale: "pt-BR", digest: true },
    },
  };
}

function userClient(accessToken: string): SupabaseClient {
  const env = publicSupabaseEnv();
  if (!env) throw new Error("Supabase não configurado.");
  return createClient(env.url, env.publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapProject(p: Record<string, unknown>): Project {
  return {
    id: String(p.id),
    user_id: String(p.user_id),
    name: String(p.name),
    description: String(p.description ?? ""),
    status: (p.status as Project["status"]) ?? "draft",
    is_archived: Boolean(p.is_archived),
    updated_at: String(p.updated_at ?? new Date().toISOString()),
  };
}

function interviewText(prd: ProjectPrd | undefined): { text: string; prd?: ProjectPrd } {
  if (!prd) {
    return {
      text: "Este projeto ainda não tem entrevista. Continue no app web em /projects/.../interview.",
    };
  }
  if (prd.stage === "interview") {
    const pending = prd.questions.filter((q) => q.answer === null);
    const answered = prd.questions.length - pending.length;
    const next = pending[0];
    return {
      prd,
      text: [
        `Entrevista em andamento (${answered}/${prd.questions.length} respondidas).`,
        next ? `Próxima: ${next.question}` : "Aguardando novas perguntas no app web.",
        "Para gerar o PRD e aprovar, use o IdeiaMap no navegador.",
      ].join("\n"),
    };
  }
  if (prd.stage === "review") {
    return {
      prd,
      text: "PRD em revisão no app. Aprove lá para liberar a geração de documentos pelo bot.",
    };
  }
  return {
    prd,
    text: "PRD aprovado. Você já pode gerar documentos neste chat (botão Documentos).",
  };
}

export async function listUserProjects(opts: {
  userId: string;
  email: string;
  name: string;
  accessToken?: string;
}): Promise<Project[]> {
  if (isSupabaseMode() && opts.accessToken) {
    const client = userClient(opts.accessToken);
    const { data, error } = await client
      .from("projects")
      .select("*")
      .eq("user_id", opts.userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => mapProject(p as Record<string, unknown>));
  }
  const { adapter } = openTelegramAdapter(mockSession(opts.userId, opts.email, opts.name));
  return adapter.listProjects(opts.userId).filter((p) => !p.is_archived);
}

export async function createUserProject(opts: {
  userId: string;
  email: string;
  name: string;
  projectName: string;
  description: string;
  accessToken?: string;
}): Promise<Project> {
  if (isSupabaseMode() && opts.accessToken) {
    const client = userClient(opts.accessToken);
    const id = `proj_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const row = {
      id,
      user_id: opts.userId,
      name: opts.projectName.trim(),
      description: opts.description.trim(),
      status: "draft",
      is_archived: false,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client.from("projects").insert(row).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "Não criou o projeto.");
    return mapProject(data as Record<string, unknown>);
  }
  const { adapter, commit } = openTelegramAdapter(mockSession(opts.userId, opts.email, opts.name));
  const project = adapter.startProjectInterview(opts.userId, {
    name: opts.projectName,
    description: opts.description,
  });
  commit();
  return project;
}

export async function getProjectSummary(opts: {
  userId: string;
  email: string;
  name: string;
  projectId: string;
  accessToken?: string;
}): Promise<string> {
  if (isSupabaseMode() && opts.accessToken) {
    const client = userClient(opts.accessToken);
    const { data: project, error } = await client
      .from("projects")
      .select("*")
      .eq("id", opts.projectId)
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (error || !project) throw new Error(error?.message ?? "Projeto não encontrado.");
    const [reqs, screens, prd, artifacts] = await Promise.all([
      client.from("requirements").select("id").eq("project_id", opts.projectId),
      client.from("screens").select("id").eq("project_id", opts.projectId),
      client.from("project_prds").select("stage").eq("project_id", opts.projectId).maybeSingle(),
      client.from("project_artifacts").select("kind,status").eq("project_id", opts.projectId),
    ]);
    return [
      String(project.name),
      String(project.description ?? ""),
      `Status: ${project.status}`,
      `Requisitos: ${reqs.data?.length ?? 0} · Telas: ${screens.data?.length ?? 0}`,
      `PRD: ${prd.data?.stage ?? "nenhum"}`,
      `Docs: ${(artifacts.data ?? []).map((a) => `${a.kind}(${a.status})`).join(", ") || "nenhum"}`,
    ].join("\n");
  }
  const { adapter } = openTelegramAdapter(mockSession(opts.userId, opts.email, opts.name));
  const project = adapter.getProject(opts.projectId);
  if (!project || project.user_id !== opts.userId) throw new Error("Projeto não encontrado.");
  const reqs = adapter.listRequirements(opts.projectId);
  const screens = adapter.listScreens(opts.projectId);
  const prd = adapter.getProjectPrd(opts.projectId);
  const artifacts = adapter.listArtifacts(opts.projectId);
  return [
    `${project.name}`,
    project.description,
    `Status: ${project.status}`,
    `Requisitos: ${reqs.length} · Telas: ${screens.length}`,
    `PRD: ${prd?.stage ?? "nenhum"}`,
    `Docs: ${artifacts.map((a) => `${a.kind}(${a.status})`).join(", ") || "nenhum"}`,
  ].join("\n");
}

export async function getInterviewStatus(opts: {
  userId: string;
  email: string;
  name: string;
  projectId: string;
  accessToken?: string;
}): Promise<{ text: string; prd?: ProjectPrd }> {
  if (isSupabaseMode() && opts.accessToken) {
    const client = userClient(opts.accessToken);
    const { data: project } = await client
      .from("projects")
      .select("id")
      .eq("id", opts.projectId)
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (!project) throw new Error("Projeto não encontrado.");
    const { data } = await client
      .from("project_prds")
      .select("*")
      .eq("project_id", opts.projectId)
      .maybeSingle();
    const prd = data
      ? ({
          id: String(data.id),
          project_id: String(data.project_id),
          stage: data.stage as ProjectPrd["stage"],
          questions: (data.questions as ProjectPrd["questions"]) ?? [],
          prd_markdown: String(data.prd_markdown ?? ""),
          approved_at: data.approved_at ? String(data.approved_at) : null,
          updated_at: String(data.updated_at ?? ""),
        } satisfies ProjectPrd)
      : undefined;
    return interviewText(prd);
  }
  const { adapter } = openTelegramAdapter(mockSession(opts.userId, opts.email, opts.name));
  const project = adapter.getProject(opts.projectId);
  if (!project || project.user_id !== opts.userId) throw new Error("Projeto não encontrado.");
  return interviewText(adapter.getProjectPrd(opts.projectId));
}

export async function generateNextDoc(opts: {
  userId: string;
  email: string;
  name: string;
  projectId: string;
  accessToken?: string;
}): Promise<{ kind: ArtifactKind; markdown: string }> {
  if (isSupabaseMode() && opts.accessToken) {
    const client = userClient(opts.accessToken);
    const { data: project } = await client
      .from("projects")
      .select("id")
      .eq("id", opts.projectId)
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (!project) throw new Error("Projeto não encontrado.");
    const { data: prdRow } = await client
      .from("project_prds")
      .select("*")
      .eq("project_id", opts.projectId)
      .maybeSingle();
    if (!prdRow || prdRow.stage !== "approved" || !String(prdRow.prd_markdown ?? "").trim()) {
      throw new Error("Aprove o PRD no app web antes de gerar documentos pelo Telegram.");
    }
    const { data: artifactRows } = await client
      .from("project_artifacts")
      .select("*")
      .eq("project_id", opts.projectId);
    const artifacts = (artifactRows ?? []).map(
      (a) =>
        ({
          id: String(a.id),
          project_id: String(a.project_id),
          kind: a.kind as ArtifactKind,
          markdown: String(a.markdown ?? ""),
          status: a.status as ProjectArtifact["status"],
          approved_at: a.approved_at ? String(a.approved_at) : null,
          updated_at: String(a.updated_at ?? ""),
        }) satisfies ProjectArtifact,
    );
    const kind = nextArtifactKind(artifacts);
    if (!kind) throw new Error("Todos os documentos da cadeia já existem.");
    const { data: screenRows } = await client.from("screens").select("*").eq("project_id", opts.projectId);
    const { data: reqRows } = await client.from("requirements").select("*").eq("project_id", opts.projectId);
    const screens = (screenRows ?? []) as unknown as Screen[];
    const requirements = (reqRows ?? []) as unknown as Requirement[];
    const markdown = await generateArtifact(kind, async (repair) => {
      const messages = repair.length
        ? repair
        : buildArtifactMessages({
            kind,
            prd: String(prdRow.prd_markdown),
            artifacts,
            screens,
            requirements,
          });
      return completeLlm({ messages, purpose: `telegram-artifact:${kind}`, json: false });
    });
    const docId = `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();
    const { error } = await client.from("project_artifacts").upsert({
      id: artifacts.find((a) => a.kind === kind)?.id ?? docId,
      project_id: opts.projectId,
      kind,
      markdown,
      status: "draft",
      approved_at: null,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
    return { kind, markdown };
  }

  const { adapter, commit } = openTelegramAdapter(mockSession(opts.userId, opts.email, opts.name));
  const project = adapter.getProject(opts.projectId);
  if (!project || project.user_id !== opts.userId) throw new Error("Projeto não encontrado.");
  const prd = adapter.getProjectPrd(opts.projectId);
  if (!prd || prd.stage !== "approved" || !prd.prd_markdown.trim()) {
    throw new Error("Aprove o PRD no app web antes de gerar documentos pelo Telegram.");
  }
  const artifacts = adapter.listArtifacts(opts.projectId);
  const kind = nextArtifactKind(artifacts);
  if (!kind) throw new Error("Todos os documentos da cadeia já existem.");
  const screens = adapter.listScreens(opts.projectId);
  const requirements = adapter.listRequirements(opts.projectId);
  const markdown = await generateArtifact(kind, async (repair) => {
    const messages = repair.length
      ? repair
      : buildArtifactMessages({
          kind,
          prd: prd.prd_markdown,
          artifacts,
          screens,
          requirements,
        });
    return completeLlm({ messages, purpose: `telegram-artifact:${kind}`, json: false });
  });
  adapter.saveArtifactDraft(opts.projectId, kind, markdown);
  commit();
  return { kind, markdown };
}

export async function readDoc(opts: {
  userId: string;
  email: string;
  name: string;
  projectId: string;
  kind: ArtifactKind;
  accessToken?: string;
}): Promise<ProjectArtifact> {
  if (isSupabaseMode() && opts.accessToken) {
    const client = userClient(opts.accessToken);
    const { data: project } = await client
      .from("projects")
      .select("id")
      .eq("id", opts.projectId)
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (!project) throw new Error("Projeto não encontrado.");
    const { data } = await client
      .from("project_artifacts")
      .select("*")
      .eq("project_id", opts.projectId)
      .eq("kind", opts.kind)
      .maybeSingle();
    if (!data) throw new Error(`Documento ${opts.kind} ainda não existe.`);
    return {
      id: String(data.id),
      project_id: String(data.project_id),
      kind: data.kind as ArtifactKind,
      markdown: String(data.markdown ?? ""),
      status: data.status as ProjectArtifact["status"],
      approved_at: data.approved_at ? String(data.approved_at) : null,
      updated_at: String(data.updated_at ?? ""),
    };
  }
  const { adapter } = openTelegramAdapter(mockSession(opts.userId, opts.email, opts.name));
  const project = adapter.getProject(opts.projectId);
  if (!project || project.user_id !== opts.userId) throw new Error("Projeto não encontrado.");
  const doc = adapter.listArtifacts(opts.projectId).find((a) => a.kind === opts.kind);
  if (!doc) throw new Error(`Documento ${opts.kind} ainda não existe.`);
  return doc;
}

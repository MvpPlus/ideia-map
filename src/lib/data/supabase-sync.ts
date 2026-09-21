import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createSeed } from "@/lib/data/seed";
import type { DatabaseSnapshot, Session, User } from "@/lib/types";
import type { MockAdapter } from "@/lib/data/mock-adapter";

function emptySnapshot(): DatabaseSnapshot {
  const seed = createSeed();
  return {
    ...seed,
    users: [],
    subscriptions: [],
    projects: [],
    requirements: [],
    screens: [],
    chat_messages: [],
    project_versions: [],
    exports: [],
    credit_transactions: [],
    url_fetches: [],
    analyses: [],
    competitors: [],
    personas: [],
    data_models: [],
    jobs: [],
    audit_logs: [],
    cost_entries: [],
    prompt_templates: [],
  };
}

function mapProfile(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: User["preferences"];
}): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as User["role"],
    preferences: row.preferences,
  };
}

export async function loadSnapshotFromSupabase(): Promise<{ snapshot: DatabaseSnapshot; session: Session | null }> {
  const client = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { snapshot: emptySnapshot(), session: null };

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,email,name,role,preferences")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) throw new Error("Perfil não encontrado. Confira a migration Supabase.");

  const isAdmin = profile.role === "admin";
  const base = emptySnapshot();

  const { data: plans } = await client.from("plans").select("*");
  base.plans = (plans ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    project_limit: p.project_limit,
    credits_limit: p.credits_limit,
    price: Number(p.price),
  }));

  const usersQuery = isAdmin
    ? client.from("profiles").select("id,email,name,role,preferences")
    : client.from("profiles").select("id,email,name,role,preferences").eq("id", user.id);
  const { data: usersRows } = await usersQuery;
  base.users = (usersRows ?? []).map(mapProfile);

  const { data: subs } = await client.from("subscriptions").select("*");
  base.subscriptions = (subs ?? []).map((s) => ({
    id: s.id,
    user_id: s.user_id,
    plan_id: s.plan_id,
    status: s.status,
  }));

  const { data: credits } = await client
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  base.credit_transactions = (credits ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    operation: c.operation,
    credits: c.credits,
    cost: Number(c.cost),
    created_at: c.created_at,
  }));

  const { data: projects } = await client.from("projects").select("*").order("updated_at", { ascending: false });
  base.projects = (projects ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    description: p.description,
    status: p.status,
    is_archived: p.is_archived,
    updated_at: p.updated_at,
  }));

  const projectIds = base.projects.map((p) => p.id);
  if (projectIds.length) {
    const [reqs, scr, chat, vers, exps, fetches, ans, cmp, per, dm] = await Promise.all([
      client.from("requirements").select("*").in("project_id", projectIds),
      client.from("screens").select("*").in("project_id", projectIds),
      client.from("chat_messages").select("*").in("project_id", projectIds),
      client.from("project_versions").select("*").in("project_id", projectIds),
      client.from("exports").select("*").in("project_id", projectIds),
      client.from("url_fetches").select("*").in("project_id", projectIds),
      client.from("analyses").select("*").in("project_id", projectIds),
      client.from("competitors").select("*").in("project_id", projectIds),
      client.from("personas").select("*").in("project_id", projectIds),
      client.from("data_models").select("*").in("project_id", projectIds),
    ]);
    base.requirements = (reqs.data ?? []).map((r) => ({
      id: r.id,
      project_id: r.project_id,
      title: r.title,
      description: r.description,
      priority: r.priority,
    }));
    base.screens = (scr.data ?? []).map((s) => ({
      id: s.id,
      project_id: s.project_id,
      name: s.name,
      route: s.route,
      description: s.description,
      wireframe_html: s.wireframe_html,
      components: s.components ?? [],
    }));
    base.chat_messages = (chat.data ?? []).map((m) => ({
      id: m.id,
      project_id: m.project_id,
      context: m.context,
      role: m.role,
      content: m.content,
    }));
    base.project_versions = (vers.data ?? []).map((v) => ({
      id: v.id,
      project_id: v.project_id,
      number: v.number,
      snapshot: v.snapshot,
      created_at: v.created_at,
    }));
    base.exports = (exps.data ?? []).map((e) => ({
      id: e.id,
      project_id: e.project_id,
      targets: e.targets,
      status: e.status,
      file_url: e.file_url,
      version_number: e.version_number,
      created_at: e.created_at,
    }));
    base.url_fetches = (fetches.data ?? []).map((f) => ({
      id: f.id,
      project_id: f.project_id,
      url: f.url,
      text: f.text,
      error: f.error,
      fetched_at: f.fetched_at,
    }));
    base.analyses = (ans.data ?? []).map((a) => ({
      id: a.id,
      project_id: a.project_id,
      findings: a.findings ?? [],
    }));
    base.competitors = (cmp.data ?? []).map((c) => ({
      id: c.id,
      project_id: c.project_id,
      name: c.name,
      url: c.url,
      notes: c.notes,
    }));
    base.personas = (per.data ?? []).map((p) => ({
      id: p.id,
      project_id: p.project_id,
      name: p.name,
      job: p.job,
      stories: p.stories ?? [],
      acceptance: p.acceptance ?? [],
    }));
    base.data_models = (dm.data ?? []).map((m) => ({
      id: m.id,
      project_id: m.project_id,
      tables: m.tables ?? [],
      notes: m.notes,
    }));
  }

  const { data: aiRow } = await client.from("ai_settings").select("models").eq("user_id", user.id).maybeSingle();
  base.ai_settings = {
    id: "ai_supabase",
    openrouter_api_key: "",
    models: aiRow?.models ?? createSeed().ai_settings.models,
  };

  if (isAdmin) {
    const [{ data: jobs }, { data: templates }, { data: audit }, { data: costs }] = await Promise.all([
      client.from("jobs").select("*"),
      client.from("prompt_templates").select("*"),
      client.from("audit_logs").select("*").order("created_at", { ascending: false }),
      client.from("cost_entries").select("*"),
    ]);
    base.jobs = (jobs ?? []).map((j) => ({
      id: j.id,
      project_id: j.project_id,
      type: j.type,
      status: j.status,
      payload: j.payload ?? {},
      error: j.error,
    }));
    base.prompt_templates = (templates ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      content: t.content,
      version: t.version,
      is_published: t.is_published,
    }));
    base.audit_logs = (audit ?? []).map((a) => ({
      id: a.id,
      user_id: a.user_id,
      action: a.action,
      details: a.details ?? {},
      created_at: a.created_at,
    }));
    base.cost_entries = (costs ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      description: c.description,
      amount: Number(c.amount),
      period: c.period,
    }));
  }

  return { snapshot: base, session: { user: mapProfile(profile) } };
}

export async function flushSnapshotToSupabase(inner: MockAdapter): Promise<void> {
  const client = createSupabaseBrowserClient();
  const session = inner.getSession();
  if (!session) return;
  const db = inner.getDb();
  const userId = session.user.id;
  const projectIds = db.projects.filter((p) => p.user_id === userId).map((p) => p.id);

  await client.from("profiles").upsert({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    preferences: session.user.preferences,
  });

  if (db.projects.length) {
    await client.from("projects").upsert(
      db.projects.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        description: p.description,
        status: p.status,
        is_archived: p.is_archived,
        updated_at: p.updated_at,
      })),
    );
  }

  const upsertOrphans = async (
    table: string,
    rows: Record<string, unknown>[],
    idField = "id",
    scope?: { column: string; ids: string[] },
  ) => {
    if (rows.length) await client.from(table).upsert(rows);
    if (scope && scope.ids.length) {
      const keep = new Set(rows.map((r) => String(r[idField])));
      const { data: existing } = await client.from(table).select("id").in(scope.column, scope.ids);
      const toDelete = (existing ?? []).map((r) => r.id).filter((id) => !keep.has(id));
      if (toDelete.length) await client.from(table).delete().in("id", toDelete);
    }
  };

  const reqs = db.requirements.filter((r) => projectIds.includes(r.project_id));
  await upsertOrphans(
    "requirements",
    reqs.map((r) => ({ ...r })),
    "id",
    projectIds.length ? { column: "project_id", ids: projectIds } : undefined,
  );

  const scr = db.screens.filter((s) => projectIds.includes(s.project_id));
  await upsertOrphans(
    "screens",
    scr.map((s) => ({ ...s, components: s.components })),
    "id",
    projectIds.length ? { column: "project_id", ids: projectIds } : undefined,
  );

  const chat = db.chat_messages.filter((m) => projectIds.includes(m.project_id));
  await upsertOrphans(
    "chat_messages",
    chat.map((m) => ({ id: m.id, project_id: m.project_id, context: m.context, role: m.role, content: m.content })),
    "id",
    projectIds.length ? { column: "project_id", ids: projectIds } : undefined,
  );

  const vers = db.project_versions.filter((v) => projectIds.includes(v.project_id));
  await upsertOrphans("project_versions", vers.map((v) => ({ ...v })), "id");

  const exps = db.exports.filter((e) => projectIds.includes(e.project_id));
  await upsertOrphans("exports", exps.map((e) => ({ ...e })), "id");

  const fetches = db.url_fetches.filter((f) => projectIds.includes(f.project_id));
  await upsertOrphans("url_fetches", fetches.map((f) => ({ ...f })), "id");

  const ans = db.analyses.filter((a) => projectIds.includes(a.project_id));
  await upsertOrphans("analyses", ans.map((a) => ({ id: a.id, project_id: a.project_id, findings: a.findings })), "id");

  const cmp = db.competitors.filter((c) => projectIds.includes(c.project_id));
  await upsertOrphans("competitors", cmp.map((c) => ({ ...c })), "id");

  const per = db.personas.filter((p) => projectIds.includes(p.project_id));
  await upsertOrphans(
    "personas",
    per.map((p) => ({ id: p.id, project_id: p.project_id, name: p.name, job: p.job, stories: p.stories, acceptance: p.acceptance })),
    "id",
  );

  const dm = db.data_models.filter((m) => projectIds.includes(m.project_id));
  await upsertOrphans(
    "data_models",
    dm.map((m) => ({ id: m.id, project_id: m.project_id, tables: m.tables, notes: m.notes })),
    "id",
  );

  const credits = db.credit_transactions.filter((c) => c.user_id === userId);
  if (credits.length) {
    await client.from("credit_transactions").upsert(credits);
  }

  await client.from("ai_settings").upsert({
    user_id: userId,
    models: db.ai_settings.models,
  });

  if (session.user.role === "admin") {
    for (const plan of db.plans) {
      await client.from("plans").upsert(plan);
    }
    for (const u of db.users) {
      await client.from("profiles").upsert({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        preferences: u.preferences,
      });
    }
  }

  const deletedProjects = await client.from("projects").select("id").eq("user_id", userId);
  const keepProjects = new Set(projectIds);
  const remove = (deletedProjects.data ?? []).map((p) => p.id).filter((id) => !keepProjects.has(id));
  if (remove.length) await client.from("projects").delete().in("id", remove);
}

import { FREE_MODELS, createSeed } from "@/lib/data/seed";
import { buildWireframeHtml } from "@/lib/screens/wireframe";
import type { GeneratedPlan } from "@/lib/ai/openrouter";
import type {
  CreateProjectInput,
  DataRepository,
} from "@/lib/data/repository";
import type {
  AiSettings,
  AnalysisFinding,
  ChatMessage,
  DataTable,
  DatabaseSnapshot,
  ExportRecord,
  ExportTarget,
  Plan,
  Project,
  ProjectAnalysis,
  Requirement,
  Screen,
  Session,
  User,
} from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";

const DB_KEY = "ideiamap:db";
const SESSION_KEY = "ideiamap:session";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function screenHtml(screen: {
  name: string;
  route: string;
  description?: string;
  components: { name: string; actions: string[] }[];
}): string {
  return buildWireframeHtml(screen);
}

type MockAdapterOptions = {
  db?: DatabaseSnapshot;
  session?: Session | null;
  /** false = memória pura (Supabase); não grava ideiamap:db no browser */
  persistLocal?: boolean;
};

export class MockAdapter implements DataRepository {
  private db: DatabaseSnapshot;
  private session: Session | null;
  private persistLocal: boolean;

  constructor(options?: MockAdapterOptions) {
    this.persistLocal = options?.persistLocal ?? true;
    const seeded = createSeed();
    if (options?.db) {
      this.db = structuredClone(options.db);
    } else {
      this.db = readJson<DatabaseSnapshot>(DB_KEY, seeded);
      if (!this.db.users?.length) this.db = seeded;
    }
    this.session =
      options?.session !== undefined
        ? options.session
        : this.persistLocal
          ? readJson<Session | null>(SESSION_KEY, null)
          : null;
    this.hydrateCollections();
    this.normalizeAiSettings();
  }

  /** Instância isolada para testes ou espelho Supabase. */
  static isolated(db: DatabaseSnapshot, session: Session | null): MockAdapter {
    return new MockAdapter({ db, session, persistLocal: false });
  }

  private hydrateCollections() {
    this.db.url_fetches ??= [];
    this.db.analyses ??= [];
    this.db.competitors ??= [];
    this.db.personas ??= [];
    this.db.data_models ??= [];
  }

  private ownedProject(projectId: string): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error("Projeto não encontrado.");
    const session = this.session;
    if (!session) throw new Error("Sem acesso a este projeto.");
    if (session.user.role !== "admin" && project.user_id !== session.user.id) {
      throw new Error("Sem acesso a este projeto.");
    }
    return project;
  }

  private normalizeAiSettings() {
    const models = this.db.ai_settings?.models;
    if (!models) return;
    const fake = Object.values(models).some((id) => id.startsWith("openrouter/free-"));
    if (!fake && this.db.ai_settings.openrouter_api_key === "") return;
    if (fake) {
      this.db.ai_settings.models = {
        prompt: "openai/gpt-4o-mini",
        prd: "openai/gpt-4o-mini",
        chat: "openai/gpt-4o-mini",
      };
    }
    this.db.ai_settings.openrouter_api_key = "";
    this.persist();
  }

  private persist() {
    this.db.ai_settings = { ...this.db.ai_settings, openrouter_api_key: "" };
    if (!this.persistLocal) return;
    writeJson(DB_KEY, this.db);
    writeJson(SESSION_KEY, this.session);
  }

  getDb(): DatabaseSnapshot {
    return this.db;
  }

  getSession(): Session | null {
    return this.session;
  }

  login(email: string, password: string): Session {
    if (!password.trim()) throw new Error("Informe a senha.");
    const normalized = email.trim().toLowerCase();
    let user = this.db.users.find((u) => u.email.toLowerCase() === normalized);
    if (!user) {
      user = {
        id: uid("user"),
        email: normalized,
        name: normalized.split("@")[0] ?? "Conta",
        role: normalized === "admin@ideiamap.dev" ? "admin" : "user",
        preferences: { locale: "pt-BR", digest: true },
      };
      this.db.users.push(user);
      this.db.subscriptions.push({
        id: uid("sub"),
        user_id: user.id,
        plan_id: "plan_start",
        status: "active",
      });
    }
    this.session = { user };
    this.persist();
    return this.session;
  }

  signup(name: string, email: string, password: string): Session {
    if (!password.trim()) throw new Error("Informe a senha.");
    const normalized = email.trim().toLowerCase();
    if (this.db.users.some((u) => u.email.toLowerCase() === normalized)) {
      return this.login(normalized, password);
    }
    const user: User = {
      id: uid("user"),
      email: normalized,
      name: name.trim() || normalized.split("@")[0] || "Conta",
      role: normalized === "admin@ideiamap.dev" ? "admin" : "user",
      preferences: { locale: "pt-BR", digest: true },
    };
    this.db.users.push(user);
    this.db.subscriptions.push({
      id: uid("sub"),
      user_id: user.id,
      plan_id: "plan_start",
      status: "active",
    });
    this.session = { user };
    this.persist();
    return this.session;
  }

  logout(): void {
    this.session = null;
    this.persist();
  }

  requestPasswordReset(email: string): void {
    if (!email.includes("@")) throw new Error("Informe um e-mail válido.");
  }

  listProjects(userId: string): Project[] {
    return this.db.projects
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  getProject(id: string): Project | undefined {
    return this.db.projects.find((p) => p.id === id);
  }

  createProject(userId: string, input: CreateProjectInput): Project {
    const project: Project = {
      id: uid("proj"),
      user_id: userId,
      name: input.name.trim(),
      description: input.description.trim(),
      status: "draft",
      is_archived: false,
      updated_at: nowIso(),
    };
    this.db.projects.unshift(project);
    if (input.plan) {
      for (const req of input.plan.requirements) {
        this.db.requirements.push({
          id: uid("req"),
          project_id: project.id,
          title: req.title,
          description: req.description,
          priority: req.priority,
        });
      }
      for (const screen of input.plan.screens) {
        const components = screen.components.length
          ? screen.components
          : [{ name: "Conteúdo", actions: ["Ação principal"] }];
        this.db.screens.push({
          id: uid("scr"),
          project_id: project.id,
          name: screen.name,
          route: screen.route,
          description: screen.description,
          components,
          wireframe_html: screenHtml({
            name: screen.name,
            route: screen.route,
            description: screen.description,
            components,
          }),
        });
      }
    } else {
    this.db.requirements.push({
      id: uid("req"),
      project_id: project.id,
      title: "Planejamento inicial",
      description: input.description.trim() || "Descrever o problema e o usuário principal.",
      priority: "alta",
    });
    if (input.referenceUrl?.trim()) {
      this.db.requirements.push({
        id: uid("req"),
        project_id: project.id,
        title: "Incorporar referência",
        description: `Analisar ${input.referenceUrl.trim()} e trazer fluxos relevantes (simulado).`,
        priority: "média",
      });
    }
    this.db.screens.push({
      id: uid("scr"),
      project_id: project.id,
      name: "Entrada",
      route: "/",
      description: "Primeira tela gerada a partir da descrição.",
      components: [{ name: "Botão Começar", actions: ["Navega para o fluxo principal"] }],
      wireframe_html: screenHtml({
        name: "Entrada",
        route: "/",
        description: "Primeira tela gerada a partir da descrição.",
        components: [{ name: "Botão Começar", actions: ["Navega para o fluxo principal"] }],
      }),
    });
    this.db.screens.push({
      id: uid("scr"),
      project_id: project.id,
      name: "Painel",
      route: "/dashboard",
      description: "Lista do que o usuário gerencia no produto.",
      components: [{ name: "Lista", actions: ["Filtrar", "Abrir item"] }],
      wireframe_html: screenHtml({
        name: "Painel",
        route: "/dashboard",
        description: "Lista do que o usuário gerencia no produto.",
        components: [{ name: "Lista", actions: ["Filtrar", "Abrir item"] }],
      }),
    });
    }
    this.db.chat_messages.push({
      id: uid("chat"),
      project_id: project.id,
      context: "overview",
      role: "assistant",
      content: input.plan
        ? "Planejamento gerado pela OpenRouter. Peça um ajuste ou priorize requisitos."
        : "Projeto criado. Peça para priorizar requisitos ou acrescentar uma tela.",
    });
    this.db.project_versions.push({
      id: uid("ver"),
      project_id: project.id,
      number: 1,
      created_at: nowIso(),
      snapshot: {
        name: project.name,
        description: project.description,
        requirements: this.listRequirements(project.id),
      },
    });
    this.db.credit_transactions.unshift({
      id: uid("cred"),
      user_id: userId,
      operation: "Criar projeto",
      credits: 25,
      cost: 0.75,
      created_at: nowIso(),
    });
    this.persist();
    return project;
  }

  updateProject(
    id: string,
    patch: Partial<Pick<Project, "name" | "description" | "status" | "is_archived">>,
  ): Project {
    const project = this.db.projects.find((p) => p.id === id);
    if (!project) throw new Error("Projeto não encontrado.");
    Object.assign(project, patch, { updated_at: nowIso() });
    this.persist();
    return project;
  }

  rebuildProjectFromPlan(
    id: string,
    input: { name: string; description: string; plan: GeneratedPlan },
  ): Project {
    const project = this.ownedProject(id);
    project.name = input.name.trim();
    project.description = input.description.trim();
    project.status = "draft";
    project.updated_at = nowIso();
    this.db.requirements = this.db.requirements.filter((r) => r.project_id !== id);
    this.db.screens = this.db.screens.filter((s) => s.project_id !== id);
    this.db.url_fetches = this.db.url_fetches.filter((f) => f.project_id !== id);
    this.db.analyses = this.db.analyses.filter((a) => a.project_id !== id);
    this.db.competitors = this.db.competitors.filter((c) => c.project_id !== id);
    this.db.personas = this.db.personas.filter((p) => p.project_id !== id);
    this.db.data_models = this.db.data_models.filter((m) => m.project_id !== id);
    this.db.chat_messages = this.db.chat_messages.filter((m) => m.project_id !== id);
    for (const req of input.plan.requirements) {
      this.db.requirements.push({
        id: uid("req"),
        project_id: id,
        title: req.title,
        description: req.description,
        priority: req.priority,
      });
    }
    for (const screen of input.plan.screens) {
      const components = screen.components.length
        ? screen.components
        : [{ name: "Conteúdo", actions: ["Ação principal"] }];
      this.db.screens.push({
        id: uid("scr"),
        project_id: id,
        name: screen.name,
        route: screen.route,
        description: screen.description,
        components,
        wireframe_html: screenHtml({
          name: screen.name,
          route: screen.route,
          description: screen.description,
          components,
        }),
      });
    }
    this.db.chat_messages.push({
      id: uid("chat"),
      project_id: id,
      context: "overview",
      role: "assistant",
      content:
        "Planejamento refeito a partir dos novos detalhes. Busca, análise, radar, personas e banco anteriores foram limpos.",
    });
    this.persist();
    return project;
  }

  duplicateProject(id: string): Project {
    const source = this.getProject(id);
    if (!source) throw new Error("Projeto não encontrado.");
    const copy: Project = {
      ...source,
      id: uid("proj"),
      name: `${source.name} (cópia)`,
      status: "draft",
      is_archived: false,
      updated_at: nowIso(),
    };
    this.db.projects.unshift(copy);
    for (const req of this.listRequirements(id)) {
      this.db.requirements.push({ ...req, id: uid("req"), project_id: copy.id });
    }
    for (const screen of this.listScreens(id)) {
      this.db.screens.push({ ...screen, id: uid("scr"), project_id: copy.id });
    }
    this.persist();
    return copy;
  }

  archiveProject(id: string): void {
    this.updateProject(id, { is_archived: true, status: "archived" });
  }

  deleteProject(id: string): void {
    this.db.projects = this.db.projects.filter((p) => p.id !== id);
    this.db.requirements = this.db.requirements.filter((r) => r.project_id !== id);
    this.db.screens = this.db.screens.filter((s) => s.project_id !== id);
    this.db.chat_messages = this.db.chat_messages.filter((m) => m.project_id !== id);
    this.db.project_versions = this.db.project_versions.filter((v) => v.project_id !== id);
    this.db.exports = this.db.exports.filter((e) => e.project_id !== id);
    this.db.url_fetches = this.db.url_fetches.filter((f) => f.project_id !== id);
    this.db.analyses = this.db.analyses.filter((a) => a.project_id !== id);
    this.db.competitors = this.db.competitors.filter((c) => c.project_id !== id);
    this.db.personas = this.db.personas.filter((p) => p.project_id !== id);
    this.db.data_models = this.db.data_models.filter((m) => m.project_id !== id);
    this.persist();
  }

  listRequirements(projectId: string): Requirement[] {
    return this.db.requirements.filter((r) => r.project_id === projectId);
  }

  upsertRequirement(req: Requirement): void {
    const index = this.db.requirements.findIndex((r) => r.id === req.id);
    if (index >= 0) this.db.requirements[index] = req;
    else this.db.requirements.push(req);
    const project = this.getProject(req.project_id);
    if (project) project.updated_at = nowIso();
    this.persist();
  }

  deleteRequirement(id: string): void {
    this.db.requirements = this.db.requirements.filter((r) => r.id !== id);
    this.persist();
  }

  latestVersionNumber(projectId: string): number {
    return this.db.project_versions
      .filter((v) => v.project_id === projectId)
      .reduce((max, v) => Math.max(max, v.number), 0);
  }

  saveVersion(projectId: string): number {
    const project = this.getProject(projectId);
    if (!project) throw new Error("Projeto não encontrado.");
    const number = this.latestVersionNumber(projectId) + 1;
    this.db.project_versions.push({
      id: uid("ver"),
      project_id: projectId,
      number,
      created_at: nowIso(),
      snapshot: {
        name: project.name,
        description: project.description,
        requirements: this.listRequirements(projectId),
      },
    });
    project.status = "ready";
    project.updated_at = nowIso();
    this.persist();
    return number;
  }

  listChat(projectId: string): ChatMessage[] {
    return this.db.chat_messages.filter((m) => m.project_id === projectId && m.context === "overview");
  }

  sendChat(projectId: string, content: string, ai?: { reply: string; requirement: { title: string; description: string; priority: Requirement["priority"] } | null }): ChatMessage[] {
    const userMsg: ChatMessage = {
      id: uid("chat"),
      project_id: projectId,
      context: "overview",
      role: "user",
      content,
    };
    const suggestion = content.slice(0, 80);
    const assistant: ChatMessage = {
      id: uid("chat"),
      project_id: projectId,
      context: "overview",
      role: "assistant",
      content:
        ai?.reply ??
        `Anotado: “${suggestion}”. Sugestão: criar o requisito “${suggestion}” com prioridade média e um critério de aceite verificável na tela correspondente.`,
    };
    this.db.chat_messages.push(userMsg, assistant);
    if (ai) {
      if (ai.requirement) {
        this.db.requirements.push({
          id: uid("req"),
          project_id: projectId,
          title: ai.requirement.title,
          description: ai.requirement.description,
          priority: ai.requirement.priority,
        });
      }
    } else {
      this.db.requirements.push({
        id: uid("req"),
        project_id: projectId,
        title: suggestion || "Ajuste via chat",
        description: `Proposto pelo chat a partir de: ${content}`,
        priority: "média",
      });
    }
    const project = this.getProject(projectId);
    if (project) project.updated_at = nowIso();
    this.persist();
    return this.listChat(projectId);
  }

  listScreens(projectId: string): Screen[] {
    return this.db.screens.filter((s) => s.project_id === projectId);
  }

  createScreen(
    projectId: string,
    input: { name: string; route: string; description: string },
  ): Screen {
    const screen: Screen = {
      id: uid("scr"),
      project_id: projectId,
      name: input.name,
      route: input.route || "/",
      description: input.description,
      components: [{ name: "Conteúdo", actions: ["Editar"] }],
      wireframe_html: "",
    };
    screen.wireframe_html = screenHtml(screen);
    this.db.screens.push(screen);
    this.persist();
    return screen;
  }

  updateScreen(screen: Screen): void {
    const next = { ...screen, wireframe_html: screenHtml(screen) };
    const index = this.db.screens.findIndex((s) => s.id === screen.id);
    if (index >= 0) this.db.screens[index] = next;
    this.persist();
  }

  deleteScreen(id: string): void {
    this.db.screens = this.db.screens.filter((s) => s.id !== id);
    this.persist();
  }

  listExports(projectId: string): ExportRecord[] {
    return this.db.exports
      .filter((e) => e.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  generateExport(projectId: string, targets: ExportTarget[]): ExportRecord {
    const record: ExportRecord = {
      id: uid("exp"),
      project_id: projectId,
      targets,
      status: "ready",
      file_url: `mock://export/${projectId}`,
      version_number: this.latestVersionNumber(projectId),
      created_at: nowIso(),
    };
    this.db.exports.unshift(record);
    this.persist();
    return record;
  }

  updateProfile(
    userId: string,
    patch: Partial<Pick<User, "name" | "email" | "preferences">>,
  ): User {
    const user = this.db.users.find((u) => u.id === userId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (patch.name) user.name = patch.name;
    if (patch.email) user.email = patch.email;
    if (patch.preferences) user.preferences = { ...user.preferences, ...patch.preferences };
    if (this.session?.user.id === userId) this.session = { user };
    this.persist();
    return user;
  }

  listPlans(): Plan[] {
    return this.db.plans;
  }

  updatePlan(plan: Plan): void {
    const index = this.db.plans.findIndex((p) => p.id === plan.id);
    if (index >= 0) this.db.plans[index] = plan;
    this.persist();
  }

  listUsers(): User[] {
    return this.db.users;
  }

  updateUser(user: User): void {
    const index = this.db.users.findIndex((u) => u.id === user.id);
    if (index >= 0) this.db.users[index] = user;
    this.persist();
  }

  getAiSettings(): AiSettings {
    return { ...this.db.ai_settings, openrouter_api_key: "" };
  }

  saveAiSettings(settings: AiSettings): void {
    this.db.ai_settings = { ...settings, openrouter_api_key: "" };
    this.persist();
  }

  listUrlFetches(projectId: string) {
    this.ownedProject(projectId);
    return this.db.url_fetches.filter((f) => f.project_id === projectId);
  }

  saveUrlFetch(projectId: string, input: { url: string; text: string; error: string | null }) {
    this.ownedProject(projectId);
    const row = {
      id: uid("fetch"),
      project_id: projectId,
      url: input.url,
      text: input.text,
      error: input.error,
      fetched_at: nowIso(),
    };
    this.db.url_fetches = this.db.url_fetches.filter((f) => f.project_id !== projectId);
    this.db.url_fetches.push(row);
    this.persist();
    return row;
  }

  getAnalysis(projectId: string) {
    this.ownedProject(projectId);
    return this.db.analyses.find((a) => a.project_id === projectId);
  }

  saveAnalysis(projectId: string, findings: AnalysisFinding[]) {
    this.ownedProject(projectId);
    this.db.analyses = this.db.analyses.filter((a) => a.project_id !== projectId);
    const row = { id: uid("an"), project_id: projectId, findings };
    this.db.analyses.push(row);
    this.persist();
    return row;
  }

  listCompetitors(projectId: string) {
    this.ownedProject(projectId);
    return this.db.competitors.filter((c) => c.project_id === projectId);
  }

  saveCompetitors(projectId: string, items: { name: string; url: string; notes: string }[]) {
    this.ownedProject(projectId);
    this.db.competitors = this.db.competitors.filter((c) => c.project_id !== projectId);
    const rows = items.map((item) => ({ id: uid("cmp"), project_id: projectId, ...item }));
    this.db.competitors.push(...rows);
    this.persist();
    return rows;
  }

  listPersonas(projectId: string) {
    this.ownedProject(projectId);
    return this.db.personas.filter((p) => p.project_id === projectId);
  }

  savePersonas(projectId: string, items: { name: string; job: string; stories: string[]; acceptance: string[] }[]) {
    this.ownedProject(projectId);
    this.db.personas = this.db.personas.filter((p) => p.project_id !== projectId);
    const rows = items.map((item) => ({ id: uid("per"), project_id: projectId, ...item }));
    this.db.personas.push(...rows);
    this.persist();
    return rows;
  }

  getDataModel(projectId: string) {
    this.ownedProject(projectId);
    return this.db.data_models.find((m) => m.project_id === projectId);
  }

  saveDataModel(projectId: string, input: { tables: DataTable[]; notes: string }) {
    this.ownedProject(projectId);
    this.db.data_models = this.db.data_models.filter((m) => m.project_id !== projectId);
    const row = { id: uid("dm"), project_id: projectId, tables: input.tables, notes: input.notes };
    this.db.data_models.push(row);
    this.persist();
    return row;
  }

  listFreeModels() {
    return FREE_MODELS;
  }
}

let adapter: MockAdapter | null = null;

export function getRepository(): MockAdapter {
  if (!adapter) adapter = new MockAdapter();
  return adapter;
}

export function resetRepository() {
  adapter = new MockAdapter();
  return adapter;
}

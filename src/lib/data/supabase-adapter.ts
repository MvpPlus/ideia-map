import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MockAdapter } from "@/lib/data/mock-adapter";
import type { CreateProjectInput, DataRepository } from "@/lib/data/repository";
import { flushSnapshotToSupabase, loadSnapshotFromSupabase } from "@/lib/data/supabase-sync";
import type { ChatReply, GeneratedPlan } from "@/lib/ai/openrouter";
import type {
  AiSettings,
  AnalysisFinding,
  DatabaseSnapshot,
  ExportTarget,
  Plan,
  Project,
  Requirement,
  Screen,
  Session,
  User,
} from "@/lib/types";
import { createSeed } from "@/lib/data/seed";

function blank(): DatabaseSnapshot {
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

export class SupabaseAdapter implements DataRepository {
  private inner = MockAdapter.isolated(blank(), null);
  ready = false;

  async reload(): Promise<void> {
    const { snapshot, session } = await loadSnapshotFromSupabase();
    this.inner = MockAdapter.isolated(snapshot, session);
    this.ready = true;
  }

  private guard() {
    if (!this.ready) throw new Error("Dados do Supabase ainda não carregaram.");
  }

  private mutate<T>(fn: () => T): T {
    this.guard();
    const result = fn();
    void flushSnapshotToSupabase(this.inner);
    return result;
  }

  getDb(): DatabaseSnapshot {
    this.guard();
    return this.inner.getDb();
  }

  getSession(): Session | null {
    return this.inner.getSession();
  }

  login(): Session {
    throw new Error("Login Supabase é feito pelo store (signInWithPassword).");
  }

  signup(): Session {
    throw new Error("Cadastro Supabase é feito pelo store (signUp).");
  }

  logout(): void {
    this.inner = MockAdapter.isolated(blank(), null);
    this.ready = false;
  }

  requestPasswordReset(email: string): void {
    if (!email.includes("@")) throw new Error("Informe um e-mail válido.");
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;
    void createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${site}/login` });
  }

  listProjects(userId: string) {
    this.guard();
    return this.inner.listProjects(userId);
  }

  getProject(id: string) {
    this.guard();
    return this.inner.getProject(id);
  }

  createProject(userId: string, input: CreateProjectInput) {
    return this.mutate(() => this.inner.createProject(userId, input));
  }

  updateProject(id: string, patch: Partial<Pick<Project, "name" | "description" | "status" | "is_archived">>) {
    return this.mutate(() => this.inner.updateProject(id, patch));
  }

  rebuildProjectFromPlan(id: string, input: { name: string; description: string; plan: GeneratedPlan }) {
    return this.mutate(() => this.inner.rebuildProjectFromPlan(id, input));
  }

  duplicateProject(id: string) {
    return this.mutate(() => this.inner.duplicateProject(id));
  }

  archiveProject(id: string) {
    this.mutate(() => {
      this.inner.archiveProject(id);
    });
  }

  deleteProject(id: string) {
    this.mutate(() => {
      this.inner.deleteProject(id);
    });
  }

  listRequirements(projectId: string) {
    this.guard();
    return this.inner.listRequirements(projectId);
  }

  upsertRequirement(req: Requirement) {
    this.mutate(() => {
      this.inner.upsertRequirement(req);
    });
  }

  deleteRequirement(id: string) {
    this.mutate(() => {
      this.inner.deleteRequirement(id);
    });
  }

  saveVersion(projectId: string) {
    return this.mutate(() => this.inner.saveVersion(projectId));
  }

  latestVersionNumber(projectId: string) {
    this.guard();
    return this.inner.latestVersionNumber(projectId);
  }

  listChat(projectId: string) {
    this.guard();
    return this.inner.listChat(projectId);
  }

  sendChat(projectId: string, content: string, ai?: ChatReply) {
    return this.mutate(() => this.inner.sendChat(projectId, content, ai));
  }

  listScreens(projectId: string) {
    this.guard();
    return this.inner.listScreens(projectId);
  }

  createScreen(projectId: string, input: { name: string; route: string; description: string }) {
    return this.mutate(() => this.inner.createScreen(projectId, input));
  }

  updateScreen(screen: Screen) {
    this.mutate(() => {
      this.inner.updateScreen(screen);
    });
  }

  deleteScreen(id: string) {
    this.mutate(() => {
      this.inner.deleteScreen(id);
    });
  }

  listExports(projectId: string) {
    this.guard();
    return this.inner.listExports(projectId);
  }

  generateExport(projectId: string, targets: ExportTarget[]) {
    return this.mutate(() => this.inner.generateExport(projectId, targets));
  }

  updateProfile(userId: string, patch: Partial<Pick<User, "name" | "email" | "preferences">>) {
    return this.mutate(() => this.inner.updateProfile(userId, patch));
  }

  listPlans() {
    this.guard();
    return this.inner.listPlans();
  }

  updatePlan(plan: Plan) {
    this.mutate(() => {
      this.inner.updatePlan(plan);
    });
  }

  listUsers() {
    this.guard();
    return this.inner.listUsers();
  }

  updateUser(user: User) {
    this.mutate(() => {
      this.inner.updateUser(user);
    });
  }

  getAiSettings() {
    this.guard();
    return this.inner.getAiSettings();
  }

  saveAiSettings(settings: AiSettings) {
    this.mutate(() => {
      this.inner.saveAiSettings(settings);
    });
  }

  listFreeModels() {
    return this.inner.listFreeModels();
  }

  listUrlFetches(projectId: string) {
    this.guard();
    return this.inner.listUrlFetches(projectId);
  }

  saveUrlFetch(projectId: string, input: { url: string; text: string; error: string | null }) {
    return this.mutate(() => this.inner.saveUrlFetch(projectId, input));
  }

  getAnalysis(projectId: string) {
    this.guard();
    return this.inner.getAnalysis(projectId);
  }

  saveAnalysis(projectId: string, findings: AnalysisFinding[]) {
    return this.mutate(() => this.inner.saveAnalysis(projectId, findings));
  }

  listCompetitors(projectId: string) {
    this.guard();
    return this.inner.listCompetitors(projectId);
  }

  saveCompetitors(projectId: string, items: { name: string; url: string; notes: string }[]) {
    return this.mutate(() => this.inner.saveCompetitors(projectId, items));
  }

  listPersonas(projectId: string) {
    this.guard();
    return this.inner.listPersonas(projectId);
  }

  savePersonas(
    projectId: string,
    items: { name: string; job: string; stories: string[]; acceptance: string[] }[],
  ) {
    return this.mutate(() => this.inner.savePersonas(projectId, items));
  }

  getDataModel(projectId: string) {
    this.guard();
    return this.inner.getDataModel(projectId);
  }

  saveDataModel(projectId: string, input: { tables: import("@/lib/types").DataTable[]; notes: string }) {
    return this.mutate(() => this.inner.saveDataModel(projectId, input));
  }
}

let supabaseAdapter: SupabaseAdapter | null = null;

export function getSupabaseAdapter(): SupabaseAdapter {
  if (!supabaseAdapter) supabaseAdapter = new SupabaseAdapter();
  return supabaseAdapter;
}

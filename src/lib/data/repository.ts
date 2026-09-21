import type { ChatReply, GeneratedPlan } from "@/lib/ai/openrouter";
import type {
  AiSettings,
  AnalysisFinding,
  ChatMessage,
  Competitor,
  DataModel,
  DataTable,
  DatabaseSnapshot,
  ExportRecord,
  ExportTarget,
  OpenRouterModel,
  Persona,
  Plan,
  Project,
  ProjectAnalysis,
  Requirement,
  Screen,
  Session,
  UrlFetch,
  User,
} from "@/lib/types";

export type CreateProjectInput = {
  name: string;
  description: string;
  referenceUrl?: string;
  plan?: GeneratedPlan;
};

export type DataRepository = {
  getDb(): DatabaseSnapshot;
  getSession(): Session | null;
  login(email: string, password: string): Session;
  signup(name: string, email: string, password: string): Session;
  logout(): void;
  requestPasswordReset(email: string): void;
  listProjects(userId: string): Project[];
  getProject(id: string): Project | undefined;
  createProject(userId: string, input: CreateProjectInput): Project;
  updateProject(id: string, patch: Partial<Pick<Project, "name" | "description" | "status" | "is_archived">>): Project;
  rebuildProjectFromPlan(
    id: string,
    input: { name: string; description: string; plan: GeneratedPlan },
  ): Project;
  duplicateProject(id: string): Project;
  archiveProject(id: string): void;
  deleteProject(id: string): void;
  listRequirements(projectId: string): Requirement[];
  upsertRequirement(req: Requirement): void;
  deleteRequirement(id: string): void;
  saveVersion(projectId: string): number;
  latestVersionNumber(projectId: string): number;
  listChat(projectId: string): ChatMessage[];
  sendChat(projectId: string, content: string, ai?: ChatReply): ChatMessage[];
  listScreens(projectId: string): Screen[];
  createScreen(projectId: string, input: { name: string; route: string; description: string }): Screen;
  updateScreen(screen: Screen): void;
  deleteScreen(id: string): void;
  listExports(projectId: string): ExportRecord[];
  generateExport(projectId: string, targets: ExportTarget[]): ExportRecord;
  updateProfile(userId: string, patch: Partial<Pick<User, "name" | "email" | "preferences">>): User;
  listPlans(): Plan[];
  updatePlan(plan: Plan): void;
  listUsers(): User[];
  updateUser(user: User): void;
  getAiSettings(): AiSettings;
  saveAiSettings(settings: AiSettings): void;
  listFreeModels(): OpenRouterModel[];
  listUrlFetches(projectId: string): UrlFetch[];
  saveUrlFetch(projectId: string, input: { url: string; text: string; error: string | null }): UrlFetch;
  getAnalysis(projectId: string): ProjectAnalysis | undefined;
  saveAnalysis(projectId: string, findings: AnalysisFinding[]): ProjectAnalysis;
  listCompetitors(projectId: string): Competitor[];
  saveCompetitors(projectId: string, items: { name: string; url: string; notes: string }[]): Competitor[];
  listPersonas(projectId: string): Persona[];
  savePersonas(
    projectId: string,
    items: { name: string; job: string; stories: string[]; acceptance: string[] }[],
  ): Persona[];
  getDataModel(projectId: string): DataModel | undefined;
  saveDataModel(projectId: string, input: { tables: DataTable[]; notes: string }): DataModel;
};

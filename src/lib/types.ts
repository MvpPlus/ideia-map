export type UserRole = "user" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferences: {
    locale: string;
    digest: boolean;
  };
};

export type Session = {
  user: User;
};

export type Plan = {
  id: string;
  name: string;
  project_limit: number;
  credits_limit: number;
  price: number;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "canceled" | "past_due";
};

export type ProjectStatus = "draft" | "ready" | "archived";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  is_archived: boolean;
  updated_at: string;
};

export type Requirement = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  priority: "alta" | "média" | "baixa";
};

export type ScreenComponent = {
  name: string;
  actions: string[];
};

export type Screen = {
  id: string;
  project_id: string;
  name: string;
  route: string;
  description: string;
  wireframe_html: string;
  components: ScreenComponent[];
};

export type ChatMessage = {
  id: string;
  project_id: string;
  context: "overview" | "database";
  role: "user" | "assistant";
  content: string;
};

export type ProjectVersion = {
  id: string;
  project_id: string;
  number: number;
  snapshot: {
    name: string;
    description: string;
    requirements: Requirement[];
  };
  created_at: string;
};

export type ExportTarget =
  | "claude-code"
  | "codex"
  | "cursor"
  | "antigravity"
  | "markdown";

export type ExportRecord = {
  id: string;
  project_id: string;
  targets: ExportTarget[];
  status: "ready" | "stale" | "generating";
  file_url: string | null;
  version_number: number;
  created_at: string;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  operation: string;
  credits: number;
  cost: number;
  created_at: string;
};

export type Job = {
  id: string;
  project_id: string | null;
  type: string;
  status: "queued" | "running" | "done" | "failed";
  payload: Record<string, unknown>;
  error: string | null;
};

export type PromptTemplate = {
  id: string;
  name: string;
  content: string;
  version: number;
  is_published: boolean;
};

export type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type CostEntry = {
  id: string;
  type: "ia" | "scraping" | "infra";
  description: string;
  amount: number;
  period: string;
};

export type AiSettings = {
  id: string;
  openrouter_api_key: string;
  models: {
    prompt: string;
    prd: string;
    chat: string;
  };
};

export type OpenRouterModel = {
  id: string;
  name: string;
  free: boolean;
};

export type UrlFetch = {
  id: string;
  project_id: string;
  url: string;
  text: string;
  error: string | null;
  fetched_at: string;
};

export type AnalysisFinding = {
  title: string;
  detail: string;
};

export type ProjectAnalysis = {
  id: string;
  project_id: string;
  findings: AnalysisFinding[];
};

export type Competitor = {
  id: string;
  project_id: string;
  name: string;
  url: string;
  notes: string;
};

export type Persona = {
  id: string;
  project_id: string;
  name: string;
  job: string;
  stories: string[];
  acceptance: string[];
};

export type DataColumn = {
  name: string;
  type: string;
  pk?: boolean;
};

export type DataTable = {
  name: string;
  columns: DataColumn[];
  rls: string;
};

export type DataModel = {
  id: string;
  project_id: string;
  tables: DataTable[];
  notes: string;
};

export type DatabaseSnapshot = {
  users: User[];
  plans: Plan[];
  subscriptions: Subscription[];
  projects: Project[];
  requirements: Requirement[];
  screens: Screen[];
  chat_messages: ChatMessage[];
  project_versions: ProjectVersion[];
  exports: ExportRecord[];
  credit_transactions: CreditTransaction[];
  jobs: Job[];
  prompt_templates: PromptTemplate[];
  audit_logs: AuditLog[];
  cost_entries: CostEntry[];
  ai_settings: AiSettings;
  url_fetches: UrlFetch[];
  analyses: ProjectAnalysis[];
  competitors: Competitor[];
  personas: Persona[];
  data_models: DataModel[];
};

export type CatalogEntry = { name: string; url: string; use: string };
export type CatalogService = CatalogEntry & { free_tier: string; pricing: string };

// Repositórios conferidos na API do GitHub (existem e não estão arquivados). Revisar ao atualizar.
export const SKILL_CATALOG: CatalogEntry[] = [
  { name: "anthropics/skills", url: "https://github.com/anthropics/skills", use: "skills oficiais: frontend-design, pdf, docx, xlsx, criação de skills" },
  { name: "mattpocock/skills", url: "https://github.com/mattpocock/skills", use: "grill-me e to-prd: entrevista e PRD antes de codar" },
  { name: "obra/superpowers", url: "https://github.com/obra/superpowers", use: "TDD, brainstorming, planos e depuração sistemática" },
  { name: "vercel-labs/agent-skills", url: "https://github.com/vercel-labs/agent-skills", use: "boas práticas de React/Next.js e deploy na Vercel" },
  { name: "supabase/agent-skills", url: "https://github.com/supabase/agent-skills", use: "Postgres e RLS no Supabase" },
  { name: "vercel-labs/skills", url: "https://github.com/vercel-labs/skills", use: "CLI `npx skills` para instalar skills no projeto" },
  { name: "skills.sh", url: "https://skills.sh", use: "diretório público de skills para buscar por tema" },
];

export const REPO_CATALOG: CatalogEntry[] = [
  { name: "vercel/next.js", url: "https://github.com/vercel/next.js", use: "app web full-stack" },
  { name: "expo/expo", url: "https://github.com/expo/expo", use: "app mobile iOS/Android com React Native" },
  { name: "supabase/supabase", url: "https://github.com/supabase/supabase", use: "Postgres, auth, storage e realtime" },
  { name: "shadcn-ui/ui", url: "https://github.com/shadcn-ui/ui", use: "componentes de UI acessíveis" },
  { name: "vercel/ai", url: "https://github.com/vercel/ai", use: "AI SDK: chat, streaming, tools" },
  { name: "better-auth/better-auth", url: "https://github.com/better-auth/better-auth", use: "autenticação em TypeScript" },
  { name: "drizzle-team/drizzle-orm", url: "https://github.com/drizzle-team/drizzle-orm", use: "ORM TypeScript para SQL" },
  { name: "TanStack/query", url: "https://github.com/TanStack/query", use: "cache e sincronização de dados no cliente" },
  { name: "react-hook-form/react-hook-form", url: "https://github.com/react-hook-form/react-hook-form", use: "formulários" },
  { name: "colinhacks/zod", url: "https://github.com/colinhacks/zod", use: "validação de dados" },
  { name: "pmndrs/zustand", url: "https://github.com/pmndrs/zustand", use: "estado global simples" },
  { name: "Leaflet/Leaflet", url: "https://github.com/Leaflet/Leaflet", use: "mapas com OpenStreetMap" },
  { name: "medusajs/medusa", url: "https://github.com/medusajs/medusa", use: "e-commerce, catálogo, pedidos" },
  { name: "vercel/commerce", url: "https://github.com/vercel/commerce", use: "vitrine de loja em Next.js" },
  { name: "novuhq/novu", url: "https://github.com/novuhq/novu", use: "notificações multicanal (e-mail, push, in-app)" },
  { name: "calcom/cal.diy", url: "https://github.com/calcom/cal.diy", use: "agendamento de horários" },
  { name: "meilisearch/meilisearch", url: "https://github.com/meilisearch/meilisearch", use: "busca instantânea" },
  { name: "umami-software/umami", url: "https://github.com/umami-software/umami", use: "analytics sem cookies" },
  { name: "n8n-io/n8n", url: "https://github.com/n8n-io/n8n", use: "automação de fluxos e integrações" },
];

export const SERVICE_CATALOG: CatalogService[] = [
  { name: "Supabase", url: "https://supabase.com", pricing: "https://supabase.com/pricing", use: "banco Postgres, auth, storage, realtime", free_tier: "plano Free com 2 projetos ativos e 500 MB de banco; pausa após inatividade" },
  { name: "Neon", url: "https://neon.com", pricing: "https://neon.com/pricing", use: "Postgres serverless", free_tier: "plano Free com cota mensal de armazenamento e computação" },
  { name: "Firebase", url: "https://firebase.google.com", pricing: "https://firebase.google.com/pricing", use: "auth, Firestore e push (FCM)", free_tier: "plano Spark gratuito; push FCM sem custo" },
  { name: "Vercel", url: "https://vercel.com", pricing: "https://vercel.com/pricing", use: "hospedagem de apps Next.js", free_tier: "plano Hobby gratuito, apenas uso não comercial" },
  { name: "Cloudflare Workers", url: "https://workers.cloudflare.com", pricing: "https://developers.cloudflare.com/workers/platform/pricing/", use: "APIs e sites na borda", free_tier: "plano gratuito com cota diária de requisições" },
  { name: "Expo (EAS)", url: "https://expo.dev", pricing: "https://expo.dev/pricing", use: "build e publicação de apps mobile", free_tier: "plano Free com cota mensal de builds" },
  { name: "Clerk", url: "https://clerk.com", pricing: "https://clerk.com/pricing", use: "login pronto (social, e-mail)", free_tier: "plano gratuito com cota de usuários ativos mensais" },
  { name: "OneSignal", url: "https://onesignal.com", pricing: "https://onesignal.com/pricing", use: "notificações push mobile e web", free_tier: "plano gratuito para push" },
  { name: "Resend", url: "https://resend.com", pricing: "https://resend.com/pricing", use: "e-mail transacional", free_tier: "plano Free com cota diária e mensal de e-mails" },
  { name: "Brevo", url: "https://www.brevo.com", pricing: "https://www.brevo.com/pricing/", use: "e-mail marketing e transacional", free_tier: "plano Free com cota diária de e-mails" },
  { name: "Upstash", url: "https://upstash.com", pricing: "https://upstash.com/pricing", use: "Redis, filas e rate limit serverless", free_tier: "plano gratuito com cota mensal de comandos" },
  { name: "Cloudinary", url: "https://cloudinary.com", pricing: "https://cloudinary.com/pricing", use: "upload e otimização de imagens", free_tier: "plano Free com créditos mensais" },
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org", pricing: "https://operations.osmfoundation.org/policies/tiles/", use: "dados e mapas abertos", free_tier: "gratuito; respeitar a política de uso dos tiles" },
  { name: "PostHog", url: "https://posthog.com", pricing: "https://posthog.com/pricing", use: "analytics de produto e feature flags", free_tier: "cota mensal gratuita de eventos" },
  { name: "Sentry", url: "https://sentry.io", pricing: "https://sentry.io/pricing/", use: "monitoramento de erros", free_tier: "plano Developer gratuito para 1 usuário" },
  { name: "UptimeRobot", url: "https://uptimerobot.com", pricing: "https://uptimerobot.com/pricing/", use: "monitorar se o site está no ar", free_tier: "plano Free com monitores a cada 5 minutos" },
  { name: "Google AI Studio", url: "https://aistudio.google.com", pricing: "https://ai.google.dev/pricing", use: "IA generativa (Gemini)", free_tier: "nível gratuito com limite de requisições" },
  { name: "OpenRouter", url: "https://openrouter.ai", pricing: "https://openrouter.ai/models?max_price=0", use: "vários modelos de IA numa API", free_tier: "modelos :free com limite diário" },
  { name: "GitHub Actions", url: "https://github.com/features/actions", pricing: "https://github.com/pricing", use: "CI/CD", free_tier: "gratuito em repositórios públicos; cota mensal em privados" },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function findCatalogService(url: string): CatalogService | undefined {
  const host = hostOf(url);
  if (!host) return undefined;
  return SERVICE_CATALOG.find((service) => {
    const known = hostOf(service.url);
    if (known === "github.com") return url.toLowerCase().includes("github.com/features/actions");
    return host === known || host.endsWith(`.${known}`);
  });
}

function sameUrl(a: string, b: string): boolean {
  const normalize = (url: string) => url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  return normalize(a) === normalize(b);
}

export function findCatalogEntry(entries: CatalogEntry[], url: string): CatalogEntry | undefined {
  return entries.find((entry) => sameUrl(entry.url, url));
}

function lines(entries: CatalogEntry[]): string {
  return entries.map((e) => `- ${e.name} | ${e.url} | ${e.use}`).join("\n");
}

export function catalogPrompt(): string {
  const services = SERVICE_CATALOG.map((s) => `- ${s.name} | ${s.url} | ${s.use} | ${s.free_tier}`).join("\n");
  return [
    "Catálogo verificado do IdeiaMap (prefira estes; use o link exatamente como está):",
    `Skills:\n${lines(SKILL_CATALOG)}`,
    `Repositórios:\n${lines(REPO_CATALOG)}`,
    `Serviços gratuitos (services SÓ deste catálogo):\n${services}`,
  ].join("\n");
}

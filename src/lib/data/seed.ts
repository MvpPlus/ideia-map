import type { DatabaseSnapshot } from "@/lib/types";

function wireframe(title: string, route: string, blocks: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { margin:0; font-family: Sora, system-ui, sans-serif; background:#E8ECF0; color:#14181F; }
    .frame { max-width: 920px; margin: 24px auto; background:#FBFCFD; border:1px solid #c9d1d8; min-height: 640px; }
    header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #d7dde3; }
    header strong { font-family: Georgia, serif; }
    main { padding: 20px; display:grid; gap:12px; }
    .box { border:1px dashed #8aa39a; padding:12px 14px; background:#f4f7f6; }
    .row { display:flex; gap:8px; flex-wrap:wrap; }
    button, .btn { background:#1B6B5A; color:#FBFCFD; border:0; padding:8px 12px; font: inherit; }
    .muted { color:#4d575f; font-size:13px; }
  </style>
</head>
<body>
  <div class="frame">
    <header>
      <strong>${title}</strong>
      <span class="muted">${route}</span>
    </header>
    <main>${blocks}</main>
  </div>
</body>
</html>`;
}

export function createSeed(): DatabaseSnapshot {
  return {
    users: [
      {
        id: "user_admin",
        email: "admin@ideiamap.dev",
        name: "Helena Costa",
        role: "admin",
        preferences: { locale: "pt-BR", digest: true },
      },
      {
        id: "user_marina",
        email: "marina@estudio.dev",
        name: "Marina Alves",
        role: "user",
        preferences: { locale: "pt-BR", digest: false },
      },
    ],
    plans: [
      {
        id: "plan_start",
        name: "Trilha",
        project_limit: 3,
        credits_limit: 200,
        price: 0,
      },
      {
        id: "plan_atelier",
        name: "Ateliê",
        project_limit: 20,
        credits_limit: 2000,
        price: 79,
      },
    ],
    subscriptions: [
      {
        id: "sub_marina",
        user_id: "user_marina",
        plan_id: "plan_atelier",
        status: "active",
      },
      {
        id: "sub_admin",
        user_id: "user_admin",
        plan_id: "plan_atelier",
        status: "active",
      },
    ],
    projects: [
      {
        id: "proj_cafe",
        user_id: "user_marina",
        name: "Moenda Club",
        description:
          "Assinatura mensal de cafés de origem única, com curadoria e rastreio da torra até a xícara.",
        status: "ready",
        is_archived: false,
        updated_at: "2026-09-12T14:00:00.000Z",
      },
      {
        id: "proj_map",
        user_id: "user_marina",
        name: "Mapa do Ateliê",
        description:
          "Painel interno para organizar briefings de clientes em rotas de entrega.",
        status: "draft",
        is_archived: false,
        updated_at: "2026-09-10T09:30:00.000Z",
      },
    ],
    requirements: [
      {
        id: "req_1",
        project_id: "proj_cafe",
        title: "Escolher plano de grãos",
        description: "O assinante escolhe origem, granulometria e frequência (15 ou 30 dias).",
        priority: "alta",
      },
      {
        id: "req_2",
        project_id: "proj_cafe",
        title: "Rastrear lote da torra",
        description: "Cada caixa mostra fazenda, altitude e data da torra com QR.",
        priority: "alta",
      },
      {
        id: "req_3",
        project_id: "proj_cafe",
        title: "Pausar ciclo",
        description: "Pausa de até dois ciclos sem cancelar a assinatura.",
        priority: "média",
      },
      {
        id: "req_4",
        project_id: "proj_map",
        title: "Lista de briefings",
        description: "Visão por status: rascunho, em rota, entregue.",
        priority: "alta",
      },
    ],
    screens: [
      {
        id: "scr_home",
        project_id: "proj_cafe",
        name: "Vitrine",
        route: "/",
        description: "Entrada da assinatura com origens do mês.",
        components: [
          { name: "Lista de origens", actions: ["Filtrar por região"] },
          { name: "Botão Assinar", actions: ["Navega para /planos"] },
        ],
        wireframe_html: wireframe(
          "Moenda Club — Vitrine",
          "/",
          `<div class="box">Origens deste mês: Chapada, Mantiqueira, Cerrado</div>
           <div class="row"><span class="btn">Assinar</span><span class="btn" style="background:#14181F">Ver lote</span></div>
           <p class="muted">Cartão de origem com altitude e nota sensorial.</p>`,
        ),
      },
      {
        id: "scr_plan",
        project_id: "proj_cafe",
        name: "Planos",
        route: "/planos",
        description: "Escolha de frequência e moagem.",
        components: [
          { name: "Seletor de plano", actions: ["Salva escolha"] },
          { name: "Campo endereço", actions: ["Validar CEP"] },
        ],
        wireframe_html: wireframe(
          "Moenda Club — Planos",
          "/planos",
          `<div class="box">Quinzenal · 250g</div>
           <div class="box">Mensal · 500g</div>
           <div class="row"><span class="btn">Continuar para pagamento</span></div>`,
        ),
      },
      {
        id: "scr_track",
        project_id: "proj_cafe",
        name: "Minha caixa",
        route: "/conta/caixa",
        description: "Status do envio e QR do lote.",
        components: [
          { name: "Linha do tempo", actions: ["Ver detalhes do lote"] },
          { name: "Botão Pausar", actions: ["Abre confirmação"] },
        ],
        wireframe_html: wireframe(
          "Moenda Club — Minha caixa",
          "/conta/caixa",
          `<div class="box">Torra 12 set · em trânsito</div>
           <div class="box">QR do lote · Chapada Diamantina</div>
           <div class="row"><span class="btn">Pausar próximo ciclo</span></div>`,
        ),
      },
    ],
    chat_messages: [
      {
        id: "chat_1",
        project_id: "proj_cafe",
        context: "overview",
        role: "assistant",
        content:
          "Posso refinar requisitos, priorizar a vitrine ou sugerir um critério de aceite. Diga o que mudar.",
      },
    ],
    project_versions: [
      {
        id: "ver_1",
        project_id: "proj_cafe",
        number: 3,
        created_at: "2026-09-12T14:00:00.000Z",
        snapshot: {
          name: "Moenda Club",
          description:
            "Assinatura mensal de cafés de origem única, com curadoria e rastreio da torra até a xícara.",
          requirements: [],
        },
      },
    ],
    exports: [
      {
        id: "exp_1",
        project_id: "proj_cafe",
        targets: ["cursor", "markdown"],
        status: "stale",
        file_url: null,
        version_number: 2,
        created_at: "2026-09-11T18:00:00.000Z",
      },
    ],
    credit_transactions: [
      {
        id: "cred_1",
        user_id: "user_marina",
        operation: "Gerar planejamento inicial",
        credits: 40,
        cost: 1.2,
        created_at: "2026-09-08T11:00:00.000Z",
      },
      {
        id: "cred_2",
        user_id: "user_marina",
        operation: "Chat no workspace",
        credits: 6,
        cost: 0.18,
        created_at: "2026-09-12T15:20:00.000Z",
      },
    ],
    jobs: [
      {
        id: "job_1",
        project_id: "proj_cafe",
        type: "url_analysis",
        status: "done",
        payload: { url: "https://exemplo-cafe.test", pages: 8 },
        error: null,
      },
      {
        id: "job_2",
        project_id: "proj_map",
        type: "export_pack",
        status: "failed",
        payload: { targets: ["cursor"] },
        error: "Timeout ao compactar artefatos (simulado).",
      },
      {
        id: "job_3",
        project_id: null,
        type: "model_sync",
        status: "queued",
        payload: { provider: "openrouter" },
        error: null,
      },
    ],
    prompt_templates: [
      {
        id: "tpl_prd",
        name: "PRD inicial",
        content:
          "A partir da descrição e das telas, escreva um PRD em português com objetivos, não-objetivos e requisitos priorizados.",
        version: 4,
        is_published: true,
      },
      {
        id: "tpl_chat",
        name: "Chat de refinamento",
        content:
          "Você edita um planejamento. Proponha mudanças concretas em requisitos, nunca reescreva o produto inteiro.",
        version: 2,
        is_published: true,
      },
      {
        id: "tpl_draft",
        name: "Wireframe HTML",
        content: "Gere HTML estático de baixa fidelidade, sem frameworks.",
        version: 1,
        is_published: false,
      },
    ],
    url_fetches: [],
    analyses: [
      {
        id: "an_cafe",
        project_id: "proj_cafe",
        findings: [{ title: "Assinatura na vitrine", detail: "A entrada vende origens do mês e o CTA Assinar." }],
      },
    ],
    competitors: [
      {
        id: "cmp_1",
        project_id: "proj_cafe",
        name: "Clubes de café",
        url: "https://example.com",
        notes: "Planos mensais e rastreio de lote.",
      },
    ],
    personas: [
      {
        id: "per_1",
        project_id: "proj_cafe",
        name: "Helena",
        job: "Assinante curiosa",
        stories: ["Escolher origem do mês"],
        acceptance: ["Vê nota sensorial antes de assinar"],
      },
    ],
    data_models: [
      {
        id: "dm_1",
        project_id: "proj_cafe",
        tables: [
          {
            name: "subscriptions",
            columns: [
              { name: "id", type: "uuid", pk: true },
              { name: "user_id", type: "uuid" },
            ],
            rls: "auth.uid() = user_id",
          },
        ],
        notes: "RLS por assinante.",
      },
    ],
    audit_logs: [
      {
        id: "aud_1",
        user_id: "user_admin",
        action: "plan.update",
        details: { plan_id: "plan_atelier", credits_limit: 2000 },
        created_at: "2026-09-05T10:00:00.000Z",
      },
      {
        id: "aud_2",
        user_id: "user_admin",
        action: "ai_settings.update",
        details: { chat: "openrouter/free-chat" },
        created_at: "2026-09-14T16:40:00.000Z",
      },
    ],
    cost_entries: [
      {
        id: "cost_1",
        type: "ia",
        description: "OpenRouter · agosto",
        amount: 42.8,
        period: "2026-08",
      },
      {
        id: "cost_2",
        type: "scraping",
        description: "Coleta de URLs · agosto",
        amount: 11.4,
        period: "2026-08",
      },
      {
        id: "cost_3",
        type: "infra",
        description: "Vercel · agosto",
        amount: 20,
        period: "2026-08",
      },
    ],
    ai_settings: {
      id: "ai_1",
      openrouter_api_key: "",
      models: {
        prompt: "openai/gpt-4o-mini",
        prd: "openai/gpt-4o-mini",
        chat: "openai/gpt-4o-mini",
      },
    },
  };
}

export const FREE_MODELS = [
  { id: "openrouter/free-chat", name: "Riacho Chat (free)", free: true },
  { id: "openrouter/free-long", name: "Serra Long Context (free)", free: true },
  { id: "openrouter/free-composer", name: "Trilha Composer (free)", free: true },
  { id: "openrouter/free-fast", name: "Vau Fast (free)", free: true },
];

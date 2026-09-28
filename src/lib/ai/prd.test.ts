import { planUserContent } from "@/lib/ai/openrouter";
import { buildPrdMessages, parsePrd, prdToMarkdown } from "@/lib/ai/prd";
import { SERVICE_CATALOG } from "@/lib/ai/resource-catalog";
import type { InterviewQuestion } from "@/lib/types";
import { describe, expect, it } from "vitest";

const answered: InterviewQuestion[] = [
  {
    id: "q1",
    category: "problema",
    question: "Qual dor principal?",
    why: "",
    options: ["Atraso", "Custo"],
    recommended: "Atraso",
    answer: "Atraso nos pedidos",
  },
];

const validPrd = {
  title: "Rota da Feira",
  summary: "Pedidos antecipados para feirantes.",
  problem: "Feirantes perdem vendas por falta de previsão.",
  audience: ["Feirante", "Cliente do bairro"],
  goals: ["Reduzir desperdício"],
  non_goals: ["Pagamento online"],
  features: [
    {
      name: "Catálogo semanal",
      priority: "P0",
      description: "Feirante publica itens da semana.",
      acceptance: ["Dado itens publicados, quando o cliente abre, então vê a lista"],
    },
  ],
  flows: ["Cliente reserva e retira na feira"],
  ux: "Mobile first, linguagem simples.",
  technical: "Next.js + Supabase.",
  risks: [{ risk: "Baixa adesão", mitigation: "Piloto em uma feira" }],
  metrics: ["Pedidos por semana"],
  open_questions: ["Cobrar taxa?"],
};

describe("specs/014-entrevista-prd", () => {
  it("AC-6 PRD estruturado vira markdown com as seções", () => {
    const doc = parsePrd(JSON.stringify(validPrd));
    const md = prdToMarkdown(doc);
    expect(md).toMatch(/^# Rota da Feira/);
    for (const heading of [
      "Resumo",
      "Problema",
      "Público",
      "Objetivos",
      "Fora de escopo",
      "Funcionalidades",
      "Fluxos",
      "Experiência e design",
      "Considerações técnicas",
      "Riscos",
      "Métricas",
      "Perguntas em aberto",
    ]) {
      expect(md).toContain(`## ${heading}`);
    }
    expect(md).toContain("P0");
    expect(md).toContain("Dado itens publicados");
    expect(md).toContain("Piloto em uma feira");
  });

  it("AC-6 Recusa PRD sem funcionalidade", () => {
    expect(() => parsePrd(JSON.stringify({ ...validPrd, features: [] }))).toThrow(/funcionalidade/i);
  });

  it("AC-6 Prioridade inválida vira P1", () => {
    const doc = parsePrd(
      JSON.stringify({ ...validPrd, features: [{ name: "X", priority: "urgente", description: "", acceptance: [] }] }),
    );
    expect(doc.features[0]?.priority).toBe("P1");
  });

  it("AC-6 Mensagens do PRD levam briefing e respostas", () => {
    const messages = buildPrdMessages({ briefing: "Nome: Feira", questions: answered });
    expect(messages[0]?.role).toBe("system");
    const user = messages.at(-1)?.content ?? "";
    expect(user).toContain("Nome: Feira");
    expect(user).toContain("Qual dor principal?");
    expect(user).toContain("Atraso nos pedidos");
  });

  it("AC-7 Pedir ajuste envia PRD atual e o pedido", () => {
    const messages = buildPrdMessages({
      briefing: "Nome: Feira",
      questions: answered,
      currentPrd: "# PRD antigo",
      feedback: "Inclua notificação por WhatsApp",
    });
    const user = messages.at(-1)?.content ?? "";
    expect(user).toContain("# PRD antigo");
    expect(user).toContain("Inclua notificação por WhatsApp");
  });

  it("AC-11 Recursos válidos viram seção com links", () => {
    const doc = parsePrd(
      JSON.stringify({
        ...validPrd,
        resources: {
          skills: [{ name: "supabase-postgres-best-practices", url: "https://github.com/supabase/agent-skills", why: "RLS" }],
          repos: [{ name: "supabase/supabase", url: "https://github.com/supabase/supabase", why: "Backend" }],
          services: [{ name: "Supabase", url: "https://www.supabase.com/", why: "Banco e auth" }],
        },
      }),
    );
    const supabase = SERVICE_CATALOG.find((s) => s.name === "Supabase");
    const md = prdToMarkdown(doc);
    expect(md).toContain("## Recursos recomendados");
    expect(md).toContain("[supabase/agent-skills](https://github.com/supabase/agent-skills) — RLS");
    expect(md).toContain("[supabase/supabase](https://github.com/supabase/supabase) — Backend");
    expect(md).toContain(`[Supabase](${supabase?.url}) — Banco e auth · Grátis: ${supabase?.free_tier}`);
  });

  it("AC-11 Plano gratuito vem do catálogo, não da IA", () => {
    const doc = parsePrd(
      JSON.stringify({
        ...validPrd,
        resources: { services: [{ name: "Supa", url: "https://supabase.com", why: "", free_tier: "ilimitado" }] },
      }),
    );
    expect(doc.resources.services[0]?.name).toBe("Supabase");
    expect(doc.resources.services[0]?.free_tier).not.toBe("ilimitado");
  });

  it("AC-11 Skill ou repositório do catálogo usa o nome do catálogo", () => {
    const doc = parsePrd(
      JSON.stringify({
        ...validPrd,
        resources: {
          skills: [{ name: "criação de skills", url: "https://github.com/anthropics/skills/", why: "" }],
          repos: [{ name: "expo", url: "https://github.com/expo/expo", why: "" }],
        },
      }),
    );
    expect(doc.resources.skills[0]?.name).toBe("anthropics/skills");
    expect(doc.resources.repos[0]?.name).toBe("expo/expo");
  });

  it("AC-11 Catálogo entra no prompt do PRD", () => {
    const system = buildPrdMessages({ briefing: "Nome: Feira", questions: answered })[0]?.content ?? "";
    expect(system).toContain("https://supabase.com");
    expect(system).toContain("https://github.com/anthropics/skills");
  });

  it("AC-11 Descarta link inválido, repo fora do GitHub e serviço fora do catálogo", () => {
    const doc = parsePrd(
      JSON.stringify({
        ...validPrd,
        resources: {
          skills: [{ name: "Sem link", url: "", why: "x" }, { name: "Js", url: "javascript:alert(1)", why: "x" }],
          repos: [
            { name: "Fora", url: "https://gitlab.com/a/b", why: "x" },
            { name: "Só dono", url: "https://github.com/vercel", why: "x" },
          ],
          services: [{ name: "Pago", url: "https://pago.example", why: "x", free_tier: "grátis" }],
        },
      }),
    );
    expect(doc.resources).toEqual({ skills: [], repos: [], services: [] });
  });

  it("AC-11 Limita cada lista a 5 e remove duplicados", () => {
    const repos = Array.from({ length: 7 }, (_, i) => ({ name: `r${i}`, url: `https://github.com/o/r${i}`, why: "" }));
    const doc = parsePrd(JSON.stringify({ ...validPrd, resources: { repos: [repos[0], ...repos] } }));
    expect(doc.resources.repos.map((r) => r.name)).toEqual(["r0", "r1", "r2", "r3", "r4"]);
  });

  it("AC-11 PRD sem recursos continua válido", () => {
    const md = prdToMarkdown(parsePrd(JSON.stringify(validPrd)));
    expect(md).toContain("## Recursos recomendados");
    expect(md).toContain("(nenhum sugerido)");
  });

  it("AC-8 Plano parte do PRD aprovado", () => {
    const content = planUserContent({ name: "Feira", description: "Pedidos", prd: "# Rota da Feira\n## Funcionalidades" });
    expect(content).toContain("Nome: Feira");
    expect(content).toContain("# Rota da Feira");
    expect(planUserContent({ name: "Feira", description: "Pedidos" })).not.toContain("PRD aprovado");
  });
});

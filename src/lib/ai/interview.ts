import { extractJson } from "@/lib/ai/json";
import type { ChatTurn } from "@/lib/ai/openrouter";
import { askWithRepair } from "@/lib/ai/repair";
import type { InterviewCategory, InterviewQuestion } from "@/lib/types";

export const INTERVIEW_MAX_ANSWERS = 20;
export const INTERVIEW_MIN_ANSWERS = 3;
export const SKIP_ANSWER = "Decidir depois";

export const INTERVIEW_CATEGORIES: Record<InterviewCategory, string> = {
  problema: "Problema",
  usuarios: "Usuários",
  solucao: "Solução",
  escopo: "Escopo",
  negocio: "Negócio",
  ux: "UX e design",
  tecnico: "Técnico",
  riscos: "Riscos",
  metricas: "Métricas",
};

export type DraftQuestion = Omit<InterviewQuestion, "id" | "answer">;

export type InterviewTurn = { done: true; summary: string } | { done: false; question: DraftQuestion };

export const INTERVIEW_SYSTEM = `Você é um analista de produto sênior do IdeiaMap entrevistando o dono de uma ideia de software ANTES de qualquer artefato. O objetivo é chegar a um PRD assertivo.
Regras:
- Faça UMA pergunta por vez: a mais importante que ainda falta. Resolva dependências na ordem (problema antes de solução, usuário antes de fluxo, escopo antes de detalhe técnico).
- Cubra, adaptando a profundidade: problema, usuarios, solucao, escopo, negocio, ux, tecnico, riscos, metricas. Pule o que não se aplica (ferramenta interna não precisa de monetização).
- Nunca pergunte o que o briefing ou as respostas já deixaram claro. Se a resposta for "${SKIP_ANSWER}", siga em frente.
- Dê 2 a 4 opções concretas e específicas para ESTA ideia (nada genérico, sem "Outros": o usuário já tem campo livre) e marque a recomendada, que deve ser uma das opções.
- "why" explica em uma frase por que a pergunta importa para o produto.
- Pergunta curta, em português, sem jargão.
- Quando já houver informação para um PRD sólido (em geral 8 a 15 perguntas), encerre com done=true.
Responda APENAS JSON, sem markdown, em um destes formatos:
{"done":false,"category":"problema","question":"","why":"","options":["",""],"recommended":""}
{"done":true,"summary":"resumo do que foi entendido"}`;

const CATEGORY_IDS = new Set(Object.keys(INTERVIEW_CATEGORIES));

function asCategory(value: unknown): InterviewCategory {
  const text = String(value ?? "").trim().toLowerCase();
  return CATEGORY_IDS.has(text) ? (text as InterviewCategory) : "solucao";
}

export function parseInterviewTurn(text: string): InterviewTurn {
  const data = extractJson(text) as Record<string, unknown>;
  if (data.done === true) {
    return { done: true, summary: String(data.summary ?? "").trim() };
  }
  const question = String(data.question ?? "").trim();
  if (!question) throw new Error("A IA não devolveu a próxima pergunta.");
  const options = (Array.isArray(data.options) ? data.options : [])
    .map((option) => String(option ?? "").trim())
    .filter(Boolean)
    .slice(0, 4);
  if (options.length < 2) throw new Error("A pergunta da IA precisa de ao menos 2 opções.");
  const recommended = String(data.recommended ?? "").trim();
  return {
    done: false,
    question: {
      category: asCategory(data.category),
      question,
      why: String(data.why ?? "").trim(),
      options,
      recommended: options.includes(recommended) ? recommended : options[0],
    },
  };
}

/** Modelos gratuitos às vezes omitem as opções; repetir o mesmo pedido costuma repetir o erro, então a IA recebe a resposta ruim e o motivo. */
export function nextInterviewTurn(
  ask: (repair: ChatTurn[]) => Promise<string>,
  tries = 3,
): Promise<InterviewTurn> {
  return askWithRepair({
    ask,
    parse: parseInterviewTurn,
    label: "interview",
    tries,
    retryHint:
      'Responda de novo APENAS com o JSON completo, incluindo "options" (2 a 4 opções concretas para esta ideia) e "recommended" (uma delas).',
  });
}

export function projectBriefing(project: { name: string; description: string }): string {
  return `Nome: ${project.name}\nIdeia: ${project.description}`;
}

export function answeredQuestions(questions: InterviewQuestion[]): InterviewQuestion[] {
  return questions.filter((q) => q.answer !== null);
}

export function buildInterviewMessages(briefing: string, questions: InterviewQuestion[]): ChatTurn[] {
  const turns: ChatTurn[] = [
    { role: "system", content: INTERVIEW_SYSTEM },
    { role: "user", content: `Briefing inicial:\n${briefing}` },
  ];
  for (const q of answeredQuestions(questions)) {
    turns.push({
      role: "assistant",
      content: JSON.stringify({
        done: false,
        category: q.category,
        question: q.question,
        why: q.why,
        options: q.options,
        recommended: q.recommended,
      }),
    });
    turns.push({ role: "user", content: q.answer ?? SKIP_ANSWER });
  }
  return turns;
}

const ANSWER_SEPARATOR = "; ";

export function combineAnswer(options: string[], selected: string[], text: string): string {
  const parts = options.filter((option) => selected.includes(option));
  const free = text.trim();
  if (free) parts.push(free);
  return parts.join(ANSWER_SEPARATOR);
}

export function splitAnswer(options: string[], answer: string | null): { selected: string[]; text: string } {
  if (!answer || answer === SKIP_ANSWER) return { selected: [], text: "" };
  const parts = answer.split(ANSWER_SEPARATOR);
  return {
    selected: options.filter((option) => parts.includes(option)),
    text: parts.filter((part) => !options.includes(part)).join(ANSWER_SEPARATOR),
  };
}

export function interviewShouldFinish(answeredCount: number): boolean {
  return answeredCount >= INTERVIEW_MAX_ANSWERS;
}

export function canGeneratePrd(answeredCount: number): boolean {
  return answeredCount >= INTERVIEW_MIN_ANSWERS;
}

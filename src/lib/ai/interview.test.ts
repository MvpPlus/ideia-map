import {
  INTERVIEW_MAX_ANSWERS,
  SKIP_ANSWER,
  buildInterviewMessages,
  canGeneratePrd,
  combineAnswer,
  interviewShouldFinish,
  splitAnswer,
  nextInterviewTurn,
  parseInterviewTurn,
} from "@/lib/ai/interview";
import type { InterviewQuestion } from "@/lib/types";
import { describe, expect, it, vi } from "vitest";

function question(patch: Partial<InterviewQuestion> = {}): InterviewQuestion {
  return {
    id: "q1",
    category: "problema",
    question: "Qual dor principal?",
    why: "Define o foco",
    options: ["Atraso", "Custo"],
    recommended: "Atraso",
    answer: null,
    ...patch,
  };
}

describe("specs/014-entrevista-prd", () => {
  it("AC-2 Uma pergunta por vez com recomendada entre as opções", () => {
    const turn = parseInterviewTurn(
      JSON.stringify({
        done: false,
        category: "usuarios",
        question: " Quem usa primeiro? ",
        why: "Prioriza o fluxo",
        options: ["Feirante", "Cliente", "Ambos"],
        recommended: "Feirante",
      }),
    );
    expect(turn.done).toBe(false);
    if (turn.done) return;
    expect(turn.question.question).toBe("Quem usa primeiro?");
    expect(turn.question.category).toBe("usuarios");
    expect(turn.question.options).toHaveLength(3);
    expect(turn.question.options).toContain(turn.question.recommended);
  });

  it("AC-2 Limita a 4 opções e corrige recomendada inválida", () => {
    const turn = parseInterviewTurn(
      JSON.stringify({
        category: "desconhecida",
        question: "Como cobra?",
        why: "",
        options: ["A", "B", "C", "D", "E"],
        recommended: "Z",
      }),
    );
    if (turn.done) throw new Error("esperava pergunta");
    expect(turn.question.options).toEqual(["A", "B", "C", "D"]);
    expect(turn.question.recommended).toBe("A");
    expect(turn.question.category).toBe("solucao");
  });

  it("AC-2 Recusa pergunta sem texto ou com menos de 2 opções", () => {
    expect(() => parseInterviewTurn(JSON.stringify({ question: "", options: ["A", "B"] }))).toThrow(/pergunta/i);
    expect(() => parseInterviewTurn(JSON.stringify({ question: "Oi?", options: ["A"] }))).toThrow(/opç/i);
  });

  it("AC-2 Tenta de novo quando a IA responde fora do formato", async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ done: false, question: "Qual dor?" }))
      .mockResolvedValueOnce(JSON.stringify({ question: "Qual dor?", options: ["A", "B"], recommended: "B" }));
    const turn = await nextInterviewTurn(ask);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(turn.done).toBe(false);
  });

  it("AC-2 Nova tentativa devolve à IA a resposta ruim e o erro para corrigir", async () => {
    const bad = JSON.stringify({ done: false, question: "Qual dor?" });
    const ask = vi
      .fn()
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(JSON.stringify({ question: "Qual dor?", options: ["A", "B"], recommended: "B" }));
    await nextInterviewTurn(ask);
    expect(ask.mock.calls[0]?.[0]).toEqual([]);
    const repair = ask.mock.calls[1]?.[0] as { role: string; content: string }[];
    expect(repair[0]).toEqual({ role: "assistant", content: bad });
    expect(repair[1]?.role).toBe("user");
    expect(repair[1]?.content).toMatch(/opç/i);
    expect(repair[1]?.content).toContain("options");
  });

  it("AC-2 Desiste depois de três respostas fora do formato", async () => {
    const ask = vi.fn().mockResolvedValue(JSON.stringify({ question: "Qual dor?" }));
    await expect(nextInterviewTurn(ask)).rejects.toThrow(/opç/i);
    expect(ask).toHaveBeenCalledTimes(3);
  });

  it("AC-5 IA sinaliza fim", () => {
    expect(parseInterviewTurn(JSON.stringify({ done: true, summary: "ok" })).done).toBe(true);
  });

  it("AC-3 Contexto acumulado em ordem", () => {
    const messages = buildInterviewMessages("Nome: Feira\nIdeia: pedidos", [
      question({ id: "q1", answer: "Atraso" }),
      question({ id: "q2", question: "Quem usa?", answer: SKIP_ANSWER }),
      question({ id: "q3", question: "Pendente?", answer: null }),
    ]);
    expect(messages[0]?.role).toBe("system");
    expect(messages[1]).toMatchObject({ role: "user" });
    expect(messages[1]?.content).toContain("pedidos");
    const roles = messages.slice(2).map((m) => m.role);
    expect(roles).toEqual(["assistant", "user", "assistant", "user"]);
    expect(messages[2]?.content).toContain("Qual dor principal?");
    expect(messages[3]?.content).toContain("Atraso");
    expect(messages[5]?.content).toContain(SKIP_ANSWER);
    expect(messages.map((m) => m.content).join("\n")).not.toContain("Pendente?");
  });

  it("AC-4 Pular grava Decidir depois", () => {
    expect(SKIP_ANSWER).toBe("Decidir depois");
  });

  it("AC-5 Fim adaptativo com teto e mínimo", () => {
    expect(INTERVIEW_MAX_ANSWERS).toBe(20);
    expect(interviewShouldFinish(19)).toBe(false);
    expect(interviewShouldFinish(20)).toBe(true);
    expect(canGeneratePrd(2)).toBe(false);
    expect(canGeneratePrd(3)).toBe(true);
  });

  const options = ["Catálogo", "Agenda", "Chat"];

  it("AC-4 Várias opções viram uma resposta na ordem das opções", () => {
    expect(combineAnswer(options, ["Chat", "Catálogo"], "")).toBe("Catálogo; Chat");
  });

  it("AC-4 Texto livre entra por último junto das opções", () => {
    expect(combineAnswer(options, ["Agenda"], "  lembrete por push ")).toBe("Agenda; lembrete por push");
    expect(combineAnswer(options, [], "só texto")).toBe("só texto");
  });

  it("AC-4 Nada marcado nem escrito dá resposta vazia", () => {
    expect(combineAnswer(options, [], "   ")).toBe("");
  });

  it("AC-12 Ajuste reabre com as opções marcadas e o resto no texto", () => {
    expect(splitAnswer(options, "Catálogo; Chat; lembrete por push")).toEqual({
      selected: ["Catálogo", "Chat"],
      text: "lembrete por push",
    });
    expect(splitAnswer(options, "Agenda")).toEqual({ selected: ["Agenda"], text: "" });
    expect(splitAnswer(options, SKIP_ANSWER)).toEqual({ selected: [], text: "" });
    expect(splitAnswer(options, null)).toEqual({ selected: [], text: "" });
  });
});

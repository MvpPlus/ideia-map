import type { ChatTurn } from "@/lib/ai/openrouter";

/** Pede de novo mostrando à IA a resposta ruim e o motivo; repetir o mesmo pedido não corrige modelos gratuitos. */
export async function askWithRepair<T>(opts: {
  ask: (repair: ChatTurn[]) => Promise<string>;
  parse: (raw: string) => T;
  retryHint: string;
  label: string;
  tries?: number;
}): Promise<T> {
  const tries = opts.tries ?? 3;
  let lastError: unknown;
  let repair: ChatTurn[] = [];
  for (let attempt = 0; attempt < tries; attempt++) {
    const content = await opts.ask(repair);
    try {
      return opts.parse(content);
    } catch (err) {
      lastError = err;
      console.error(`[${opts.label}] fora do formato`, content.slice(0, 600));
      const reason = err instanceof Error ? err.message : "formato inválido";
      repair = [
        { role: "assistant", content },
        { role: "user", content: `Sua resposta veio fora do formato: ${reason} ${opts.retryHint}` },
      ];
    }
  }
  throw lastError instanceof Error ? lastError : new Error("A IA não respondeu no formato pedido.");
}

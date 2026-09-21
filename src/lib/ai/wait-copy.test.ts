import { GENERATING_LINES, lineAt, nextFakeProgress, shuffleLines } from "@/lib/ai/wait-copy";
import { describe, expect, it } from "vitest";

describe("specs/006-ai-wait", () => {
  it("AC-2 Progresso", () => {
    expect(nextFakeProgress(0)).toBeGreaterThan(0);
    expect(nextFakeProgress(90)).toBeLessThanOrEqual(92);
    expect(nextFakeProgress(92)).toBe(92);
  });

  it("AC-1 Overlay frases", () => {
    const deck = ["a", "b", "c"];
    expect(lineAt(0, 2800, deck)).toBe("a");
    expect(lineAt(3000, 2800, deck)).toBe("b");
  });

  it("AC-3 Frases", () => {
    expect(GENERATING_LINES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(GENERATING_LINES).size).toBe(GENERATING_LINES.length);
    const seq = [0.9, 0.1, 0.5, 0.2, 0.8];
    let i = 0;
    const shuffled = shuffleLines(["a", "b", "c"], () => seq[i++] ?? 0);
    expect([...shuffled].sort()).toEqual(["a", "b", "c"]);
    expect(shuffled.join()).not.toBe("a,b,c");
  });
});

import { eventFromCompletion, summarizeUsage, type LlmCompletion, type LlmUsageEvent } from "@/lib/ai/usage";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAX_EVENTS = 500;

export function usageLogPath(): string {
  return join(process.cwd(), ".ideiamap-usage.json");
}

export function listUsageEvents(): LlmUsageEvent[] {
  try {
    const parsed = JSON.parse(readFileSync(usageLogPath(), "utf8")) as { events?: LlmUsageEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export function recordCompletion(completion: LlmCompletion, purpose: string): LlmUsageEvent | null {
  try {
    const event = eventFromCompletion(completion, purpose);
    const events = [event, ...listUsageEvents()].slice(0, MAX_EVENTS);
    writeFileSync(usageLogPath(), JSON.stringify({ events }, null, 2), "utf8");
    return event;
  } catch {
    return null;
  }
}

export function usageSnapshot() {
  const events = listUsageEvents();
  return { events, summary: summarizeUsage(events) };
}

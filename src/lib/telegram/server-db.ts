import { MockAdapter } from "@/lib/data/mock-adapter";
import { createSeed } from "@/lib/data/seed";
import type { DatabaseSnapshot, Session } from "@/lib/types";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function telegramDbPath(): string {
  return join(process.cwd(), ".ideiamap-telegram-db.json");
}

function readDb(): DatabaseSnapshot {
  try {
    const parsed = JSON.parse(readFileSync(telegramDbPath(), "utf8")) as DatabaseSnapshot;
    if (parsed?.users?.length) return parsed;
  } catch {
    // seed
  }
  return createSeed();
}

function writeDb(db: DatabaseSnapshot) {
  writeFileSync(telegramDbPath(), JSON.stringify(db, null, 2), "utf8");
}

/** Adapter mock persistido em arquivo para o bot (não usa localStorage). */
export function openTelegramAdapter(session: Session | null): {
  adapter: MockAdapter;
  commit: () => void;
} {
  const adapter = MockAdapter.isolated(readDb(), session);
  return {
    adapter,
    commit: () => {
      const inner = adapter as unknown as { db: DatabaseSnapshot };
      writeDb(inner.db);
    },
  };
}

export function resetTelegramDbForTests(): void {
  writeDb(createSeed());
}

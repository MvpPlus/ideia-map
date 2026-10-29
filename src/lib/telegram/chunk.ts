export const TELEGRAM_CHUNK_LIMIT = 3500;

/** Fatia texto para caber nas mensagens do Telegram. */
export function chunkTelegramText(text: string, limit = TELEGRAM_CHUNK_LIMIT): string[] {
  const raw = text.trim();
  if (!raw) return [];
  if (raw.length <= limit) return [raw];
  const parts: string[] = [];
  let rest = raw;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n\n", limit);
    if (cut < limit * 0.4) cut = rest.lastIndexOf("\n", limit);
    if (cut < limit * 0.4) cut = limit;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

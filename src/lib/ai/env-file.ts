export function readDotEnvValue(source: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*${key}=(.*)$`, "m");
  const match = source.match(pattern);
  if (!match) return undefined;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

export function upsertDotEnv(source: string, entries: Record<string, string>): string {
  let next = source.replace(/\r\n/g, "\n");
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^\\s*${key}=.*$`, "m");
    if (pattern.test(next)) next = next.replace(pattern, line);
    else next = `${next.replace(/\s*$/, "")}\n${line}\n`;
  }
  if (!next.endsWith("\n")) next += "\n";
  return next;
}

export function maskSecret(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length < 8) return "••••";
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

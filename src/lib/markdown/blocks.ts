export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string; nested: boolean }
  | { type: "task"; text: string; done: boolean }
  | { type: "ordered"; n: number; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "table"; header: string[]; rows: string[][] };

const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const fence = line.match(/^```\s*([\w-]*)/);
    if (fence) {
      const code: string[] = [];
      while (++i < lines.length && !/^```\s*$/.test(lines[i] ?? "")) code.push(lines[i] ?? "");
      blocks.push({ type: "code", lang: (fence[1] ?? "").toLowerCase(), code: code.join("\n").trimEnd() });
      continue;
    }
    if (line.trim().startsWith("|") && TABLE_SEPARATOR.test(lines[i + 1] ?? "")) {
      const rows: string[][] = [];
      i += 1;
      while (i + 1 < lines.length && (lines[i + 1] ?? "").trim().startsWith("|")) rows.push(cells(lines[++i] ?? ""));
      blocks.push({ type: "table", header: cells(line), rows });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1]?.length ?? 1, text: heading[2]?.trim() ?? "" });
      continue;
    }
    const task = line.match(/^\s*[-*] \[( |x|X)\] (.*)$/);
    if (task) {
      blocks.push({ type: "task", text: task[2] ?? "", done: task[1] !== " " });
      continue;
    }
    const bullet = line.match(/^(\s*)[-*] (.*)$/);
    if (bullet) {
      blocks.push({ type: "bullet", text: bullet[2] ?? "", nested: Boolean(bullet[1]) });
      continue;
    }
    const ordered = line.match(/^\s*(\d+)[.)] (.*)$/);
    if (ordered) {
      blocks.push({ type: "ordered", n: Number(ordered[1]), text: ordered[2] ?? "" });
      continue;
    }
    if (line.trim()) blocks.push({ type: "paragraph", text: line.trim() });
  }
  return blocks;
}

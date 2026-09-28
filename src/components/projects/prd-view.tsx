import { MermaidDiagram } from "@/components/projects/mermaid-diagram";
import { parseMarkdownBlocks, type MarkdownBlock } from "@/lib/markdown/blocks";

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-paper px-1 font-mono text-xs text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-trail underline underline-offset-2 hover:text-ink"
        >
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.type) {
    case "heading":
      if (block.level === 1) return <h2 className="display text-3xl text-ink">{block.text}</h2>;
      if (block.level === 2) return <h3 className="display pt-5 text-xl text-ink">{block.text}</h3>;
      return <h4 className="pt-3 font-semibold text-ink">{block.text}</h4>;
    case "bullet":
      return (
        <p className={`flex gap-2 ${block.nested ? "pl-5" : ""}`}>
          <span className="text-trail">•</span>
          <span>{inline(block.text)}</span>
        </p>
      );
    case "task":
      return (
        <p className="flex gap-2">
          <span
            aria-hidden
            className={`mt-1 grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
              block.done ? "border-emerald-400 bg-emerald-400 text-paper" : "border-white/30"
            }`}
          >
            {block.done ? "✓" : ""}
          </span>
          <span>{inline(block.text)}</span>
        </p>
      );
    case "ordered":
      return (
        <p className="flex gap-2">
          <span className="text-trail">{block.n}.</span>
          <span>{inline(block.text)}</span>
        </p>
      );
    case "code":
      if (block.lang === "mermaid") return <MermaidDiagram code={block.code} />;
      return (
        <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-3 font-mono text-xs leading-5 text-ink">
          {block.code}
        </pre>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index} className="border-b border-line px-2 py-1.5 font-semibold text-ink">
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-line/60 px-2 py-1.5 align-top">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return <p>{inline(block.text)}</p>;
  }
}

export function PrdView({ markdown }: { markdown: string }) {
  return (
    <article className="space-y-2 text-sm leading-6 text-mute">
      {parseMarkdownBlocks(markdown).map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </article>
  );
}

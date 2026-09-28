"use client";

import { useEffect, useState } from "react";

let counter = 0;

export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${++counter}`;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        const result = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(result.svg);
          setError("");
        }
      } catch (err) {
        document.getElementById(`d${id}`)?.remove();
        if (!cancelled) setError(err instanceof Error ? err.message.split("\n")[0] ?? "" : "diagrama inválido");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-amber-300">
          Não deu para desenhar este diagrama ({error}). Peça um ajuste para corrigi-lo; o código está abaixo.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-3 font-mono text-xs text-ink">{code}</pre>
      </div>
    );
  }
  if (!svg) return <p className="animate-pulse text-xs text-mute">Desenhando o diagrama…</p>;
  return (
    <div
      className="overflow-x-auto rounded-lg border border-line bg-paper p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

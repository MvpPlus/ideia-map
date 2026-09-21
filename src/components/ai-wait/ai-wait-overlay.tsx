"use client";

import { GENERATING_LINES, lineAt, nextFakeProgress, shuffleLines } from "@/lib/ai/wait-copy";
import { Lottie } from "lottie-react";
import { useEffect, useState } from "react";
import generating from "./generating.json";

type Props = {
  open: boolean;
  title?: string;
};

export function AiWaitOverlay({
  open,
  title = "Gerando com a IA",
}: Props) {
  const [progress, setProgress] = useState(4);
  const [line, setLine] = useState(GENERATING_LINES[0]);

  useEffect(() => {
    if (!open) return;
    const t0 = Date.now();
    const deck = shuffleLines();
    setProgress(4);
    setLine(lineAt(0, 2800, deck));
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - t0;
      setLine(lineAt(elapsed, 2800, deck));
      setProgress((p) => nextFakeProgress(p));
    }, 280);
    return () => window.clearInterval(tick);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/88 px-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="ai-wait-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-2xl">
        <div className="mx-auto h-36 w-36">
          <Lottie src={generating} loop autoplay className="h-full w-full" />
        </div>
        <h2 id="ai-wait-title" className="display mt-2 text-center text-2xl text-white">
          {title}
        </h2>
        <p className="mt-3 min-h-12 text-center text-sm leading-6 text-mute" aria-live="polite">
          {line}
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-trail to-emerald-400 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs tabular-nums text-mute">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}

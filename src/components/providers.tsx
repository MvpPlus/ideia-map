"use client";

import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  useEffect(() => {
    void hydrate().catch(() => {
      useAppStore.setState({ hydrated: true, session: null, db: null });
    });
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-mute">
        Abrindo o mapa…
      </div>
    );
  }

  return (
    <>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex max-w-[min(100%-2rem,24rem)] flex-col gap-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            className="pointer-events-auto rounded-xl border border-line bg-paper/95 px-3 py-2 text-left text-sm text-ink shadow-lg backdrop-blur-md"
            onClick={() => dismissToast(t.id)}
          >
            {t.text}
          </button>
        ))}
      </div>
    </>
  );
}

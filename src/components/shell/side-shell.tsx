"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavRender = (opts: { onNavigate?: () => void; logoId: string }) => React.ReactNode;

/** Esqueleto de todo o app autenticado: menu fixo à esquerda em lg+, barra superior com gaveta abaixo disso. */
export function SideShell({
  nav,
  mobileTitle,
  mobileTitleHref,
  mobileBadge,
  children,
}: {
  nav: NavRender;
  mobileTitle: string;
  mobileTitleHref?: string;
  mobileBadge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const titleClass = "display min-w-0 flex-1 truncate text-base";

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-panel lg:block">
        {nav({ logoId: "sidenav-logo" })}
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-panel/90 px-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink hover:bg-white/5"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path d="M3 6h14M3 10h14M3 14h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        {mobileTitleHref ? (
          <Link href={mobileTitleHref} className={titleClass}>
            {mobileTitle}
          </Link>
        ) : (
          <span className={titleClass}>{mobileTitle}</span>
        )}
        {mobileBadge ? <span className="mr-2">{mobileBadge}</span> : null}
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <div className="drawer-in absolute inset-y-0 left-0 w-[85%] max-w-80 border-r border-line bg-panel pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <button
              type="button"
              className="absolute top-2 right-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-mute hover:text-ink"
              aria-label="Fechar"
              onClick={() => setMenuOpen(false)}
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {nav({ onNavigate: () => setMenuOpen(false), logoId: "drawer-logo" })}
          </div>
        </div>
      ) : null}

      <main className="pt-14 pb-10 lg:pt-0 lg:pl-72">{children}</main>
    </div>
  );
}

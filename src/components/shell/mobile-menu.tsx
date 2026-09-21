"use client";

import { useEffect, useState } from "react";

export function MobileMenu({
  title,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-line bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="display mb-3 text-lg">{title}</p>
            <nav className="flex flex-col overflow-y-auto">{children}</nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function useMenuOpen() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

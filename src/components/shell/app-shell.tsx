"use client";

import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/shell/mobile-menu";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/dashboard", label: "Projetos" },
  { href: "/profile", label: "Perfil" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAppStore((s) => s.session);
  const logout = useAppStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  if (!session) return null;

  const extra = session.user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [];
  const navItems = [...links, ...extra];

  function NavLinks({ className }: { className?: string }) {
    return (
      <>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${className ?? ""} ${active ? "text-ink" : "text-mute hover:text-ink"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-panel/80 px-4 backdrop-blur-md lg:px-8">
        <Logo href="/dashboard" />
        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          <NavLinks />
        </nav>
        <div className="relative hidden lg:block">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-trail to-[#8B5CF6] text-xs font-semibold"
            onClick={() => setProfileOpen((v) => !v)}
          >
            {(session.user.name ?? "?").slice(0, 1).toUpperCase()}
          </button>
          {profileOpen ? (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-paper p-2 shadow-xl">
              <Link href="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                Perfil
              </Link>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-mute hover:bg-white/5"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                Sair
              </button>
            </div>
          ) : null}
        </div>
        <span className="lg:hidden text-sm text-mute">{(session.user.name ?? "").split(" ")[0]}</span>
      </header>

      <main className="px-4 pb-24 pt-20 lg:px-8 lg:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-line bg-panel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 min-w-16 flex-col items-center justify-center text-[11px] ${active ? "text-trail" : "text-mute"}`}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="flex min-h-11 min-w-16 flex-col items-center justify-center text-[11px] text-mute"
          onClick={() => setMenuOpen(true)}
        >
          Mais
        </button>
      </nav>

      <MobileMenu title="Menu" open={menuOpen} onOpenChange={setMenuOpen}>
        <p className="px-3 py-2 text-sm text-mute">{session.user.name}</p>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Sair
        </Button>
      </MobileMenu>
    </div>
  );
}

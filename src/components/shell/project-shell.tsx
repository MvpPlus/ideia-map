"use client";

import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/shell/mobile-menu";
import { Button } from "@/components/ui/button";
import { useAppStore, useProjectBundle } from "@/lib/store";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const primary = [
  { href: "overview", label: "Planejar" },
  { href: "screens", label: "Telas" },
  { href: "database", label: "Banco" },
  { href: "export", label: "Exportar" },
];

const more = [
  { href: "analysis", label: "Análise" },
  { href: "competitive", label: "Radar de mercado" },
  { href: "personas", label: "Personas" },
];

export function ProjectShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const session = useAppStore((s) => s.session);
  const logout = useAppStore((s) => s.logout);
  const { project, requirements, screens, latestVersion } = useProjectBundle(params.id);
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

  if (!project) {
    return (
      <div className="p-8">
        <p>Projeto não encontrado.</p>
        <Link href="/dashboard" className="text-trail underline">
          Voltar aos projetos
        </Link>
      </div>
    );
  }

  const desktopNav = [
    ...primary.filter((s) => s.href !== "database"),
    { href: "analysis", label: "Análise" },
    { href: "competitive", label: "Radar de mercado" },
    { href: "personas", label: "Personas" },
    { href: "database", label: "Banco" },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-panel/80 px-4 backdrop-blur-md lg:px-6">
        <Logo href="/dashboard" />
        <span className="hidden h-4 w-px bg-white/10 lg:block" />
        <span className="truncate rounded-full border border-line bg-paper px-3 py-1 text-xs text-mute lg:text-sm">
          {project.name}
        </span>
        <nav className="ml-auto hidden min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap text-sm lg:flex">
          {desktopNav.map((section) => {
            const href = `/projects/${project.id}/${section.href}`;
            const active = pathname === href;
            return (
              <Link
                key={section.href}
                href={href}
                className={`rounded-lg px-3 py-2 ${active ? "bg-paper text-ink" : "text-mute hover:text-ink"}`}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
        <div className="relative ml-auto hidden lg:block lg:ml-3">
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
      </header>

      <div className="pt-16 pb-24 lg:pb-10">
        <p className="border-b border-line px-4 py-2 text-xs text-mute lg:px-8">
          {requirements.length} requisitos · {screens.length} telas · versão {latestVersion || 0}
          {project.is_archived ? " · arquivado" : ""}
        </p>
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-line bg-panel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {primary.map((section) => {
          const href = `/projects/${project.id}/${section.href}`;
          const active = pathname === href;
          return (
            <Link
              key={section.href}
              href={href}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center text-[11px] ${active ? "text-trail" : "text-mute"}`}
            >
              {section.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center text-[11px] text-mute"
          onClick={() => setMenuOpen(true)}
        >
          Mais
        </button>
      </nav>

      <MobileMenu title="Mais" open={menuOpen} onOpenChange={setMenuOpen}>
        {more.map((section) => (
          <Link
            key={section.href}
            href={`/projects/${project.id}/${section.href}`}
            className="flex min-h-11 items-center px-3 text-sm"
          >
            {section.label}
          </Link>
        ))}
        <Link href="/dashboard" className="flex min-h-11 items-center px-3 text-sm text-mute">
          Projetos
        </Link>
        <Button
          variant="ghost"
          className="mt-2 w-full"
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

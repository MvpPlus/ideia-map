"use client";

import { AppNav } from "@/components/shell/app-nav";
import { SideShell } from "@/components/shell/side-shell";
import { adminSection, appNavItems } from "@/lib/nav/app-nav";
import { useAppStore } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function titleFor(pathname: string, role: "user" | "admin"): string {
  if (pathname.startsWith("/admin")) return adminSection(pathname.split("/")[2]).label;
  return appNavItems(role).find((item) => pathname === item.href)?.label ?? "IdeiaMap";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAppStore((s) => s.session);
  const logout = useAppStore((s) => s.logout);

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  if (!session) return null;

  return (
    <SideShell
      mobileTitle={titleFor(pathname, session.user.role)}
      nav={({ onNavigate, logoId }) => (
        <AppNav
          pathname={pathname}
          user={session.user}
          logoId={logoId}
          onNavigate={onNavigate}
          onLogout={() => {
            logout();
            router.push("/");
          }}
        />
      )}
    >
      <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
    </SideShell>
  );
}

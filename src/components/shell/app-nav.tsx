import { Logo } from "@/components/logo";
import { NavUserFooter } from "@/components/shell/nav-user-footer";
import { ADMIN_SECTIONS, adminSection, appNavItems } from "@/lib/nav/app-nav";
import type { User } from "@/lib/types";
import Link from "next/link";

const ICONS: Record<string, React.ReactNode> = {
  "/dashboard": (
    <>
      <path d="M3 15c3 0 3-4 7-4s4-5 7-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 3.2" />
      <circle cx="3" cy="15" r="2" fill="currentColor" />
      <circle cx="17" cy="6" r="2" fill="currentColor" />
    </>
  ),
  "/projects/new": <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  "/profile": (
    <>
      <circle cx="10" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 17c1-3 3.5-4.5 6-4.5s5 1.5 6 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  "/admin": (
    <path
      d="M10 3l6 2.5v4.5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V5.5L10 3z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  pathname,
  user,
  logoId,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  user: User;
  logoId: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const inAdmin = isActive(pathname, "/admin");
  const currentSection = inAdmin ? adminSection(pathname.split("/")[2]).slug : null;

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-3">
        <Logo href="/dashboard" markId={logoId} />
      </div>

      <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-4" aria-label="Navegação principal">
        <ul className="space-y-0.5">
          {appNavItems(user.role).map((item) => {
            const active = isActive(pathname, item.href);
            const isAdmin = item.href === "/admin";
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active && !isAdmin ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm ${
                    active && !isAdmin ? "bg-paper text-ink" : active ? "text-ink" : "text-mute hover:bg-white/[0.04] hover:text-ink"
                  }`}
                >
                  <svg viewBox="0 0 20 20" className={`h-5 w-5 ${active ? "text-trail" : ""}`} aria-hidden>
                    {ICONS[item.href]}
                  </svg>
                  {item.label}
                </Link>
                {isAdmin ? (
                  <ul className="mb-1 ml-[18px] border-l border-line pl-3">
                    {ADMIN_SECTIONS.map((section) => {
                      const sectionActive = currentSection === section.slug;
                      return (
                        <li key={section.slug}>
                          <Link
                            href={`/admin/${section.slug}`}
                            onClick={onNavigate}
                            aria-current={sectionActive ? "page" : undefined}
                            className={`flex min-h-9 items-center rounded-lg px-2 text-[13px] ${
                              sectionActive ? "bg-paper text-ink" : "text-mute hover:text-ink"
                            }`}
                          >
                            {section.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <NavUserFooter user={user} onNavigate={onNavigate} onLogout={onLogout} />
    </div>
  );
}

import type { NavItem } from "@/lib/nav/app-nav";
import type { User } from "@/lib/types";
import Link from "next/link";

export function NavUserFooter({
  user,
  links = [],
  onNavigate,
  onLogout,
}: {
  user: User;
  links?: NavItem[];
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-trail to-[#8B5CF6] text-xs font-semibold">
          {(user.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{user.name}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className="flex min-h-10 items-center rounded-lg px-2 text-mute hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
        <button type="button" onClick={onLogout} className="ml-auto flex min-h-10 items-center rounded-lg px-2 text-mute hover:text-ink">
          Sair
        </button>
      </div>
    </div>
  );
}

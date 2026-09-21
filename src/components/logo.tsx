import Link from "next/link";

export function Logo({
  href = "/dashboard",
  compact = false,
  markId = "logo-grad",
}: {
  href?: string;
  compact?: boolean;
  markId?: string;
}) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2">
      <svg viewBox="0 0 36 36" className="h-8 w-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id={markId} x1="0" y1="0" x2="36" y2="36">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="8" fill={`url(#${markId})`} />
        <path
          d="M10 10h12c2.2 0 4 1.8 4 4 0 1.5-.8 2.8-2 3.5 1.5.7 2.5 2.2 2.5 4 0 2.2-1.8 4-4 4H10"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M16 10v15.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="19" cy="17.5" r="2" fill="#60A5FA" />
      </svg>
      {compact ? null : (
        <span className="display text-lg tracking-tight text-ink">
          Ideia<span className="text-trail">Map</span>
        </span>
      )}
    </Link>
  );
}

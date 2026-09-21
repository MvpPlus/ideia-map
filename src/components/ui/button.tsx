import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "ink";
  href?: string;
};

const variants = {
  primary:
    "rounded-lg bg-gradient-to-r from-trail to-[#4F46E5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110",
  ink: "rounded-lg bg-[#8083ff] text-[#0d0096] hover:brightness-105",
  ghost:
    "rounded-lg border border-line bg-paper/70 text-ink hover:bg-[#334155] hover:border-white/20",
  danger: "rounded-lg border border-marco/40 bg-transparent text-marco hover:bg-marco/10",
};

export function Button({ variant = "primary", className = "", href, ...props }: Props) {
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 px-3.5 text-sm disabled:opacity-50 ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {props.children}
      </Link>
    );
  }
  return <button {...props} className={cls} />;
}

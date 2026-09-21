import { Logo } from "@/components/logo";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="glow-spot -left-24 -top-24 h-80 w-80 bg-trail/25" />
      <div className="glow-spot -right-16 bottom-0 h-96 w-96 bg-emerald/15" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card w-full max-w-sm space-y-5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <Logo href="/" />
      <div>
        <h1 className="display text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-mute">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

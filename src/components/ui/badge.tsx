export function Badge({
  children,
  tone = "mute",
}: {
  children: React.ReactNode;
  tone?: "mute" | "emerald" | "amber" | "trail";
}) {
  const tones = {
    mute: "bg-panel text-mute",
    emerald: "bg-emerald/15 text-emerald",
    amber: "bg-marco/15 text-marco",
    trail: "bg-trail/20 text-[#c0c1ff]",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tones}`}>
      {children}
    </span>
  );
}

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-mute">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-white/15 bg-[#0B0F17] px-3 py-2 text-ink placeholder:text-[#64748B] focus:border-trail focus:shadow-[0_0_0_3px_rgba(99,102,241,0.25)] focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} min-h-11 ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} min-h-28 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${fieldClass} min-h-11 cursor-pointer appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10 ${props.className ?? ""}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%2394A3B8' d='M1 1l5 5 5-5'/></svg>\")",
        ...props.style,
      }}
    />
  );
}

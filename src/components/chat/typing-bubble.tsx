/** Balão de “digitando…” no chat (sem overlay de tela cheia). */
export function ChatTypingBubble({ label = "Mapa" }: { label?: string }) {
  return (
    <li className="rounded-xl bg-panel px-3 py-2 text-mute" aria-live="polite" aria-label={`${label} está digitando`}>
      <span className="text-xs">{label}</span>
      <p className="chat-typing mt-1" aria-hidden>
        <span />
        <span />
        <span />
      </p>
    </li>
  );
}

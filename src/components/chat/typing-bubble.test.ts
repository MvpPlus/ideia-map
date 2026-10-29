import { ChatTypingBubble } from "@/components/chat/typing-bubble";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("specs/006-ai-wait AC-4", () => {
  it("AC-4 Chat sem overlay — balão de digitando", () => {
    const html = renderToStaticMarkup(createElement(ChatTypingBubble));
    expect(html).toContain("está digitando");
    expect(html).toContain("chat-typing");
    expect(html).not.toContain("AiWaitOverlay");
  });
});

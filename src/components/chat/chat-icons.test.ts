import { ChatBubbleIcon, MicIcon, PaperclipIcon } from "@/components/chat/chat-icons";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("specs/019-chat-flutuante-projeto AC-8", () => {
  it("AC-8 Controles do painel — ícones", () => {
    expect(renderToStaticMarkup(createElement(ChatBubbleIcon))).toContain("svg");
    expect(renderToStaticMarkup(createElement(PaperclipIcon))).toContain("svg");
    expect(renderToStaticMarkup(createElement(MicIcon))).toContain("svg");
  });
});

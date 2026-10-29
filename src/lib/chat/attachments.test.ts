import {
  classifyAttachment,
  extractDocumentText,
  formatAttachmentNotes,
  IMAGE_MAX_BYTES,
} from "@/lib/chat/attachments";
import { describe, expect, it, vi } from "vitest";

describe("specs/019-chat-flutuante-projeto anexos", () => {
  it("AC-4 classifica imagem", () => {
    expect(classifyAttachment({ name: "a.png", type: "image/png", size: 100 })).toBe("image");
    expect(classifyAttachment({ name: "a.png", type: "image/png", size: IMAGE_MAX_BYTES + 1 })).toBe("too_large");
  });

  it("AC-5 extrai texto de md/txt", async () => {
    const buf = Buffer.from("# Hello\n\nworld", "utf8");
    const text = await extractDocumentText({ name: "n.md", type: "text/markdown", bytes: buf });
    expect(text).toContain("Hello");
    expect(text).toContain("world");
  });

  it("AC-5 PDF com texto embutido", async () => {
    // Minimal PDF with a stream containing "IdeiaMap"
    const pdf = Buffer.from(
      `%PDF-1.1
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (IdeiaMap) Tj ET
endstream
endobj
trailer<<>>
%%EOF`,
      "utf8",
    );
    const text = await extractDocumentText({ name: "a.pdf", type: "application/pdf", bytes: pdf });
    expect(text).toMatch(/IdeiaMap/i);
  });

  it("AC-6 notes de anexos — áudio só com o texto transcrito", () => {
    const mixed = formatAttachmentNotes([
      { kind: "image", name: "x.png" },
      { kind: "audio", name: "a.mp3", transcript: "oi" },
    ]);
    expect(mixed).toContain("[imagem: x.png]");
    expect(mixed).toContain("oi");
    expect(mixed).not.toMatch(/áudio:|Transcrição/i);

    const audioOnly = formatAttachmentNotes([{ kind: "audio", name: "gravacao-1.webm", transcript: "olá mundo" }]);
    expect(audioOnly).toBe("olá mundo");
    expect(audioOnly).not.toMatch(/gravacao|áudio|Transcrição/i);
  });

  it("AC-6 transcreve via Groq Whisper", async () => {
    const { transcribeAudio } = await import("@/lib/chat/attachments");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "pedido de café" }),
    });
    const text = await transcribeAudio({
      apiKey: "gsk-test",
      bytes: Buffer.from("fake"),
      filename: "a.webm",
      mime: "audio/webm",
      fetchImpl,
    });
    expect(text).toBe("pedido de café");
    expect(fetchImpl).toHaveBeenCalled();
  });
});

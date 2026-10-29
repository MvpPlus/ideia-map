import {
  classifyAttachment,
  extractDocumentText,
  formatAttachmentNotes,
  mimeToGeminiInline,
  transcribeAudio,
  type AttachmentMeta,
} from "@/lib/chat/attachments";
import { completeLlm } from "@/lib/ai/complete";
import { completeGeminiVision } from "@/lib/ai/gemini-vision";
import { CHAT_SYSTEM, parseChatReply, type ChatReply } from "@/lib/ai/openrouter";
import { loadGoogleAiKey, loadGroqKey } from "@/lib/ai/persist-env";
import { recordCompletion } from "@/lib/ai/persist-usage";

export type ChatFileInput = {
  name: string;
  type: string;
  bytes: Buffer;
};

export async function runProjectChat(opts: {
  message: string;
  context: string;
  model?: string;
  files?: ChatFileInput[];
  fetchImpl?: typeof fetch;
}): Promise<ChatReply & { attachmentNotes: string }> {
  const message = opts.message.trim();
  if (!message && !(opts.files?.length)) {
    throw new Error("Escreva uma mensagem ou anexe um arquivo.");
  }

  const metas: AttachmentMeta[] = [];
  const images: { mimeType: string; base64: string }[] = [];

  for (const file of opts.files ?? []) {
    const kind = classifyAttachment({ name: file.name, type: file.type, size: file.bytes.length });
    if (kind === "too_large") throw new Error(`Arquivo grande demais: ${file.name}`);
    if (kind === "unsupported") throw new Error(`Tipo não suportado: ${file.name}`);
    if (kind === "image") {
      images.push({
        mimeType: mimeToGeminiInline(file.type || "image/png"),
        base64: file.bytes.toString("base64"),
      });
      metas.push({ kind: "image", name: file.name });
    } else if (kind === "document") {
      const extractedText = await extractDocumentText({
        name: file.name,
        type: file.type,
        bytes: file.bytes,
      });
      metas.push({ kind: "document", name: file.name, extractedText });
    } else if (kind === "audio") {
      const groq = loadGroqKey();
      if (!groq) throw new Error("Configure GROQ_API_KEY em .env.local para transcrever áudio.");
      const transcript = await transcribeAudio({
        apiKey: groq,
        bytes: file.bytes,
        filename: file.name,
        mime: file.type || "audio/webm",
        fetchImpl: opts.fetchImpl,
      });
      metas.push({ kind: "audio", name: file.name, transcript });
    }
  }

  const attachmentNotes = formatAttachmentNotes(metas);
  const audioOnly =
    metas.length > 0 && metas.every((m) => m.kind === "audio") && metas.some((m) => m.transcript?.trim());
  const audioTranscript = audioOnly
    ? metas
        .map((m) => m.transcript?.trim() ?? "")
        .filter(Boolean)
        .join("\n")
    : "";
  // Áudio: a transcrição é o pedido (não vai de novo no bloco de anexos com rótulos).
  const notesForContext = audioOnly ? "" : attachmentNotes;
  const contextBlock = [opts.context.trim(), notesForContext].filter(Boolean).join("\n\n");
  const pedido = message || audioTranscript || "(ver anexos)";
  const userPrompt = `${contextBlock ? `Contexto do projeto:\n${contextBlock}\n\n` : ""}Pedido: ${pedido}`;
  const notesForUi = audioOnly ? audioTranscript : attachmentNotes;

  if (images.length) {
    const google = loadGoogleAiKey();
    if (!google) {
      throw new Error("Para analisar imagens, configure GOOGLE_AI_STUDIO_API_KEY em .env.local.");
    }
    const completion = await completeGeminiVision({
      apiKey: google,
      system: CHAT_SYSTEM,
      prompt: userPrompt,
      images,
      json: true,
      fetchImpl: opts.fetchImpl,
    });
    recordCompletion(completion, "chat");
    return { ...parseChatReply(completion.text), attachmentNotes: notesForUi };
  }

  const content = await completeLlm({
    model: opts.model,
    purpose: "chat",
    messages: [
      { role: "system", content: CHAT_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    fetchImpl: opts.fetchImpl,
  });
  return { ...parseChatReply(content), attachmentNotes: notesForUi };
}

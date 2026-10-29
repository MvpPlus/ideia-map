export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const DOC_MAX_BYTES = 8 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 15 * 1024 * 1024;
export const DOC_TEXT_MAX = 20_000;

export type AttachmentKind = "image" | "document" | "audio" | "unsupported" | "too_large";

export type AttachmentMeta = {
  kind: "image" | "document" | "audio";
  name: string;
  transcript?: string;
  extractedText?: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/flac",
]);

export function classifyAttachment(file: { name: string; type: string; size: number }): AttachmentKind {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (IMAGE_TYPES.has(type) || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
    return file.size > IMAGE_MAX_BYTES ? "too_large" : "image";
  }
  if (
    type.startsWith("text/") ||
    type === "application/pdf" ||
    type === "application/markdown" ||
    /\.(txt|md|markdown|pdf)$/i.test(name)
  ) {
    return file.size > DOC_MAX_BYTES ? "too_large" : "document";
  }
  if (AUDIO_TYPES.has(type) || /\.(webm|mp3|wav|m4a|ogg|flac)$/i.test(name)) {
    return file.size > AUDIO_MAX_BYTES ? "too_large" : "audio";
  }
  return "unsupported";
}

function clip(text: string, max = DOC_TEXT_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 20)}\n…[truncado]`;
}

/** Extrai strings literais simples de PDF (sem OCR). */
export function extractPdfTextRough(bytes: Buffer): string {
  const raw = bytes.toString("latin1");
  const matches = [...raw.matchAll(/\((?:\\\)|[^)]){2,}\)/g)].map((m) =>
    m[0]
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\"),
  );
  const joined = matches.join(" ").replace(/\s+/g, " ").trim();
  if (!joined) throw new Error("Não foi possível ler texto deste PDF. Tente .txt ou .md.");
  return clip(joined);
}

export async function extractDocumentText(opts: {
  name: string;
  type: string;
  bytes: Buffer;
}): Promise<string> {
  const name = opts.name.toLowerCase();
  const type = opts.type.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfTextRough(opts.bytes);
  }
  return clip(opts.bytes.toString("utf8"));
}

export async function transcribeAudio(opts: {
  apiKey: string;
  bytes: Buffer;
  filename: string;
  mime: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) throw new Error("Configure GROQ_API_KEY em .env.local para transcrever áudio.");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const form = new FormData();
  form.append(
    "file",
    new Blob([Uint8Array.from(opts.bytes)], { type: opts.mime || "audio/webm" }),
    opts.filename || "audio.webm",
  );
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "pt");
  const response = await fetchImpl("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const payload = (await response.json()) as { text?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Groq Whisper recusou (${response.status}).`);
  }
  const text = payload.text?.trim() ?? "";
  if (!text) throw new Error("Transcrição de áudio vazia.");
  return clip(text, 8_000);
}

export function formatAttachmentNotes(items: AttachmentMeta[]): string {
  if (!items.length) return "";
  const lines: string[] = [];
  for (const item of items) {
    if (item.kind === "image") lines.push(`[imagem: ${item.name}]`);
    else if (item.kind === "document") {
      lines.push(`[doc: ${item.name}]`);
      if (item.extractedText) lines.push(`Conteúdo do documento:\n${item.extractedText}`);
    } else if (item.kind === "audio") {
      // Na UI/histórico: só o texto falado, sem nome do arquivo nem rótulo "Transcrição".
      if (item.transcript?.trim()) lines.push(item.transcript.trim());
    }
  }
  return lines.join("\n");
}

/** Texto que aparece no balão do usuário após o envio (áudio = só transcrição). */
export function userMessageFromChat(opts: {
  typed: string;
  attachmentNotes: string;
  hadAudioOnly: boolean;
}): string {
  const typed = opts.typed.trim();
  const notes = opts.attachmentNotes.trim();
  if (opts.hadAudioOnly && notes) return typed ? `${typed}\n${notes}` : notes;
  if (typed && notes) return `${typed}\n${notes}`;
  return notes || typed;
}

export function mimeToGeminiInline(mime: string): string {
  if (mime === "image/jpg") return "image/jpeg";
  return mime || "image/jpeg";
}

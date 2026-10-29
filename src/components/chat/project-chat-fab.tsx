"use client";

import { ChatBubbleIcon, MicIcon, PaperclipIcon } from "@/components/chat/chat-icons";
import { ChatTypingBubble } from "@/components/chat/typing-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildProjectChatContext } from "@/lib/chat/project-context";
import { classifyAttachment, userMessageFromChat } from "@/lib/chat/attachments";
import type { ChatReply } from "@/lib/ai/openrouter";
import { dataRepository } from "@/lib/data";
import { useAppStore, useProjectBundle } from "@/lib/store";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PendingFile = {
  id: string;
  file: File;
  kind: "image" | "document" | "audio";
};

async function postChat(opts: {
  message: string;
  context: string;
  model?: string;
  files: File[];
}): Promise<ChatReply & { attachmentNotes?: string }> {
  if (opts.files.length) {
    const form = new FormData();
    form.set("message", opts.message);
    form.set("context", opts.context);
    if (opts.model) form.set("model", opts.model);
    opts.files.forEach((file, index) => form.append(`file${index}`, file, file.name));
    const response = await fetch("/api/ai/chat", { method: "POST", body: form });
    const body = (await response.json()) as ChatReply & { error?: string; attachmentNotes?: string };
    if (!response.ok) throw new Error(body.error ?? `Erro ${response.status}`);
    return body;
  }
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: opts.message,
      context: opts.context,
      model: opts.model,
    }),
  });
  const body = (await response.json()) as ChatReply & { error?: string; attachmentNotes?: string };
  if (!response.ok) throw new Error(body.error ?? `Erro ${response.status}`);
  return body;
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export function ProjectChatFab({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const bundle = useProjectBundle(projectId);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const db = useAppStore((s) => s.db);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  /** Áudio: não mostra "…" nem balão de digitando — só aparece quando a transcrição chega. */
  const [quietWait, setQuietWait] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const endRef = useRef<HTMLLIElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messageRef = useRef(message);
  const submitRef = useRef<(opts: { text: string; files: File[]; hadAudioOnly: boolean }) => Promise<void>>(
    async () => undefined,
  );

  const chat = bundle.chat;
  const project = bundle.project;
  messageRef.current = message;

  useEffect(() => {
    if (open && (busy || pendingUser || chat.length)) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [open, busy, pendingUser, chat.length]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const visiblePending = pendingFiles.filter((p) => p.kind !== "audio");

  if (!project) return null;
  const currentProject = project;

  async function submitChat(opts: { text: string; files: File[]; hadAudioOnly: boolean }) {
    if (busy) return;
    const text = opts.text.trim();
    if (!text && !opts.files.length) return;
    const silent = opts.hadAudioOnly && !text;
    setMessage("");
    setPendingFiles([]);
    if (silent) {
      setPendingUser(null);
      setQuietWait(true);
    } else {
      setPendingUser(text || opts.files.map((f) => f.name).join(", "));
      setQuietWait(false);
    }
    setBusy(true);
    try {
      const context = buildProjectChatContext({
        project: currentProject,
        requirements: bundle.requirements,
        screens: bundle.screens,
        prd: bundle.prd,
        artifacts: bundle.artifacts,
        analysis: bundle.analysis,
        competitors: bundle.competitors,
        personas: bundle.personas,
        dataModel: bundle.dataModel,
        latestVersion: bundle.latestVersion,
        pathname,
      });
      const ai = await postChat({
        message: text,
        context,
        model: db?.ai_settings.models.chat,
        files: opts.files,
      });
      const stored = userMessageFromChat({
        typed: text,
        attachmentNotes: ai.attachmentNotes ?? "",
        hadAudioOnly: opts.hadAudioOnly,
      });
      dataRepository().sendChat(projectId, stored, ai);
      refresh();
    } catch (err) {
      setMessage(text);
      toast(err instanceof Error ? err.message : "Chat indisponível.");
    } finally {
      setPendingUser(null);
      setQuietWait(false);
      setBusy(false);
    }
  }

  submitRef.current = submitChat;

  function pushPending(file: File, kind: PendingFile["kind"]) {
    setPendingFiles((prev) =>
      [...prev, { id: `${file.name}-${file.size}-${file.lastModified}-${prev.length}`, file, kind }].slice(0, 4),
    );
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      const kind = classifyAttachment({ name: file.name, type: file.type, size: file.size });
      if (kind === "too_large") {
        toast(`Arquivo grande demais: ${file.name}`);
        continue;
      }
      if (kind === "unsupported") {
        toast(`Tipo não suportado: ${file.name}`);
        continue;
      }
      pushPending(file, kind);
    }
  }

  async function toggleRecording() {
    if (busy) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast("Este navegador não grava áudio. Anexe um arquivo de áudio pelo clipe.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickAudioMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);
        if (blob.size < 200) {
          toast("Gravação muito curta.");
          return;
        }
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `gravacao-${Date.now()}.${ext}`, { type });
        const kind = classifyAttachment({ name: file.name, type: file.type, size: file.size });
        if (kind !== "audio") {
          toast("Não foi possível usar esta gravação.");
          return;
        }
        // Envia na hora — sem chip de anexo e sem clicar em Enviar.
        void submitRef.current({
          text: messageRef.current.trim(),
          files: [file],
          hadAudioOnly: true,
        });
      };
      recorder.start();
      setRecording(true);
      toast("Gravando… toque no microfone de novo para enviar.");
    } catch {
      toast("Permissão de microfone negada ou indisponível.");
      setRecording(false);
    }
  }

  async function send() {
    if (busy) return;
    if (recording) {
      toast("Pare a gravação antes de enviar.");
      return;
    }
    const text = message.trim();
    if (!text && !pendingFiles.length) return;
    const files = pendingFiles.map((p) => p.file);
    const hadAudioOnly = files.length > 0 && pendingFiles.every((p) => p.kind === "audio");
    await submitChat({ text, files, hadAudioOnly });
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Fechar chat" : "Abrir chat do projeto"}
        className="fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex h-14 min-w-14 items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-trail to-[#4F46E5] px-3.5 text-sm font-medium text-white shadow-lg shadow-trail/30 transition hover:scale-105"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <span className="text-lg leading-none">×</span>
        ) : (
          <>
            <ChatBubbleIcon className="h-5 w-5 shrink-0" />
            <span>Chat</span>
          </>
        )}
      </button>

      {open ? (
        <div
          className="fixed right-4 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.25rem)] z-40 flex h-[min(70vh,32rem)] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-line bg-paper/95 shadow-xl backdrop-blur-md"
          role="dialog"
          aria-label="Chat do projeto"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <div>
              <p className="display text-lg">Chat</p>
              <p className="text-[11px] text-mute">Projeto + página · clipe, microfone ou texto</p>
            </div>
            <button type="button" className="min-h-10 px-2 text-sm text-mute" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
            {chat.length === 0 && !pendingUser ? (
              <li className="text-xs text-mute">
                Pergunte sobre esta página ou o projeto. Use o clipe para arquivos ou o microfone para gravar e enviar.
              </li>
            ) : null}
            {chat.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl px-3 py-2 ${item.role === "user" ? "bg-trail/15 text-ink" : "bg-panel text-mute"}`}
              >
                <span className="text-xs">{item.role === "user" ? "Você" : "Mapa"}</span>
                <p className="mt-1 whitespace-pre-wrap">{item.content}</p>
              </li>
            ))}
            {pendingUser ? (
              <li className="rounded-xl bg-trail/15 px-3 py-2 text-ink">
                <span className="text-xs">Você</span>
                <p className="mt-1 whitespace-pre-wrap">{pendingUser}</p>
              </li>
            ) : null}
            {busy && !quietWait ? <ChatTypingBubble /> : null}
            <li ref={endRef} className="h-0 list-none p-0" aria-hidden />
          </ul>
          {visiblePending.length ? (
            <ul className="flex flex-wrap gap-1 border-t border-line px-3 py-2 text-[11px] text-mute">
              {visiblePending.map((p) => (
                <li key={p.id} className="rounded-full border border-line px-2 py-0.5">
                  {p.kind}: {p.file.name}
                  <button
                    type="button"
                    className="ml-1 text-marco"
                    onClick={() => setPendingFiles((prev) => prev.filter((x) => x.id !== p.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="flex gap-1.5 border-t border-line p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.pdf,.txt,.md,audio/*"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 px-2"
              disabled={busy || recording}
              onClick={() => fileRef.current?.click()}
              aria-label="Anexar arquivo"
              title="Anexar"
            >
              <PaperclipIcon className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`shrink-0 px-2 ${recording ? "text-marco" : ""}`}
              disabled={busy}
              onClick={() => void toggleRecording()}
              aria-label={recording ? "Parar e enviar áudio" : "Gravar áudio"}
              title={recording ? "Parar e enviar" : "Gravar"}
            >
              <MicIcon className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                recording
                  ? "Gravando… (toque no mic para enviar)"
                  : quietWait
                    ? "Transcrevendo áudio…"
                    : "Mensagem…"
              }
              disabled={busy || recording}
              className="min-w-0"
            />
            <Button
              type="submit"
              className="shrink-0"
              disabled={busy || recording || (!message.trim() && !pendingFiles.length)}
            >
              Enviar
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}

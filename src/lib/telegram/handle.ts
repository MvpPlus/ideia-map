import {
  answerCallbackQuery,
  sendTelegramMessage,
  type InlineButton,
  type TelegramUpdate,
  inlineKeyboard,
} from "@/lib/telegram/api";
import { telegramLogin } from "@/lib/telegram/auth";
import { chunkTelegramText } from "@/lib/telegram/chunk";
import {
  docsKeyboard,
  guestKeyboard,
  homeKeyboard,
  projectKeyboard,
  projectsKeyboard,
} from "@/lib/telegram/keyboards";
import {
  createUserProject,
  generateNextDoc,
  getInterviewStatus,
  getProjectSummary,
  listUserProjects,
  readDoc,
} from "@/lib/telegram/projects";
import {
  clearTelegramAuth,
  getTelegramSession,
  isLoggedIn,
  saveTelegramSession,
  type TelegramSession,
} from "@/lib/telegram/session";
import type { ArtifactKind } from "@/lib/types";

export type TelegramSend = (opts: {
  chatId: number;
  text: string;
  replyMarkup?: ReturnType<typeof inlineKeyboard>;
}) => Promise<void>;

export type TelegramAnswer = (opts: { callbackQueryId: string; text?: string }) => Promise<void>;

const READ_KINDS = new Set<ArtifactKind>(["trd", "flow", "design", "backend", "plan"]);

async function reply(
  send: TelegramSend,
  chatId: number,
  text: string,
  replyMarkup?: ReturnType<typeof inlineKeyboard>,
) {
  const parts = chunkTelegramText(text);
  if (parts.length === 0) {
    await send({ chatId, text: "…", replyMarkup });
    return;
  }
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const isLast = i === parts.length - 1;
    await send({ chatId, text: part, replyMarkup: isLast ? replyMarkup : undefined });
  }
}

function helpText(session: TelegramSession): string {
  if (!isLoggedIn(session)) {
    return "IdeiaMap no Telegram.\nUse Entrar com o mesmo e-mail/senha do app, ou digite /start.";
  }
  if (session.state === "project" && session.projectId) {
    return "Neste projeto: use os botões (Entrevista, Documentos, Resumo) ou diga “gera documento”, “ler trd”, “voltar”, “projetos”, “sair”.";
  }
  return "Logado. Botões: Meus projetos · Novo projeto · Sair.\nTexto livre: “projetos”, “novo”, “sair”, ou o nome de um projeto para abrir.";
}

async function requireUser(session: TelegramSession): Promise<TelegramSession> {
  if (!session.userId || !session.userEmail || !session.userName) {
    throw new Error("Faça login primeiro (botão Entrar).");
  }
  return session;
}

async function showHome(send: TelegramSend, chatId: number, session: TelegramSession) {
  const next = await saveTelegramSession({ ...session, state: "home", projectId: undefined });
  await reply(send, chatId, `Olá, ${next.userName ?? "você"}. O que vamos planejar?`, homeKeyboard());
  return next;
}

async function showProjects(send: TelegramSend, chatId: number, session: TelegramSession) {
  const s = await requireUser(session);
  const projects = await listUserProjects({
    userId: s.userId!,
    email: s.userEmail!,
    name: s.userName!,
    accessToken: s.accessToken,
  });
  if (projects.length === 0) {
    await reply(send, chatId, "Você ainda não tem projetos. Crie um com Novo projeto.", homeKeyboard());
    return await saveTelegramSession({ ...s, state: "home", projectId: undefined });
  }
  await reply(send, chatId, "Seus projetos:", projectsKeyboard(projects));
  return await saveTelegramSession({ ...s, state: "home" });
}

async function openProject(
  send: TelegramSend,
  chatId: number,
  session: TelegramSession,
  projectId: string,
) {
  const s = await requireUser(session);
  const projects = await listUserProjects({
    userId: s.userId!,
    email: s.userEmail!,
    name: s.userName!,
    accessToken: s.accessToken,
  });
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    await reply(send, chatId, "Projeto não encontrado ou não é seu.", homeKeyboard());
    return await saveTelegramSession({ ...s, state: "home", projectId: undefined });
  }
  const next = await saveTelegramSession({ ...s, state: "project", projectId });
  await reply(send, chatId, `Projeto: ${project.name}`, projectKeyboard());
  return next;
}

async function handleCallback(
  data: string,
  session: TelegramSession,
  chatId: number,
  send: TelegramSend,
): Promise<TelegramSession> {
  if (data === "help") {
    await reply(send, chatId, helpText(session), isLoggedIn(session) ? homeKeyboard() : guestKeyboard());
    return session;
  }
  if (data === "login") {
    const next = await saveTelegramSession({ ...session, state: "await_email", emailDraft: undefined });
    await reply(send, chatId, "Digite seu e-mail IdeiaMap:");
    return next;
  }
  if (data === "logout") {
    const cleared = await clearTelegramAuth(session);
    await reply(send, chatId, "Sessão encerrada. Até logo.", guestKeyboard());
    return cleared;
  }
  if (data === "home") {
    if (!isLoggedIn(session)) {
      await reply(send, chatId, "Faça login para continuar.", guestKeyboard());
      return session;
    }
    return showHome(send, chatId, session);
  }
  if (data === "projects") {
    if (!isLoggedIn(session)) {
      await reply(send, chatId, "Faça login para ver projetos.", guestKeyboard());
      return session;
    }
    return showProjects(send, chatId, session);
  }
  if (data === "new") {
    if (!isLoggedIn(session)) {
      await reply(send, chatId, "Faça login para criar projeto.", guestKeyboard());
      return session;
    }
    const next = await saveTelegramSession({ ...session, state: "await_project_name", projectId: undefined });
    await reply(send, chatId, "Nome do novo projeto:");
    return next;
  }
  if (data.startsWith("proj:") && data !== "proj:back") {
    const id = data.slice("proj:".length);
    if (!isLoggedIn(session)) {
      await reply(send, chatId, "Faça login.", guestKeyboard());
      return session;
    }
    return openProject(send, chatId, session, id);
  }
  if (data === "proj:back") {
    if (session.projectId) return openProject(send, chatId, session, session.projectId);
    return showHome(send, chatId, session);
  }
  if (data === "step:summary") {
    const s = await requireUser(session);
    if (!s.projectId) throw new Error("Abra um projeto primeiro.");
    const text = await getProjectSummary({
      userId: s.userId!,
      email: s.userEmail!,
      name: s.userName!,
      projectId: s.projectId,
      accessToken: s.accessToken,
    });
    await reply(send, chatId, text, projectKeyboard());
    return s;
  }
  if (data === "step:interview") {
    const s = await requireUser(session);
    if (!s.projectId) throw new Error("Abra um projeto primeiro.");
    const { text } = await getInterviewStatus({
      userId: s.userId!,
      email: s.userEmail!,
      name: s.userName!,
      projectId: s.projectId,
      accessToken: s.accessToken,
    });
    await reply(send, chatId, text, projectKeyboard());
    return s;
  }
  if (data === "step:docs") {
    const s = await requireUser(session);
    if (!s.projectId) throw new Error("Abra um projeto primeiro.");
    await reply(send, chatId, "Documentos técnicos:", docsKeyboard());
    return s;
  }
  if (data === "doc:gen") {
    const s = await requireUser(session);
    if (!s.projectId) throw new Error("Abra um projeto primeiro.");
    await reply(send, chatId, "Gerando próximo documento… isso pode levar um minuto.");
    const { kind, markdown } = await generateNextDoc({
      userId: s.userId!,
      email: s.userEmail!,
      name: s.userName!,
      projectId: s.projectId,
      accessToken: s.accessToken,
    });
    await reply(send, chatId, `Documento ${kind} gerado (rascunho):\n\n${markdown}`, docsKeyboard());
    return s;
  }
  if (data.startsWith("doc:read:")) {
    const kind = data.slice("doc:read:".length) as ArtifactKind;
    if (!READ_KINDS.has(kind)) throw new Error("Tipo de documento inválido.");
    const s = await requireUser(session);
    if (!s.projectId) throw new Error("Abra um projeto primeiro.");
    const doc = await readDoc({
      userId: s.userId!,
      email: s.userEmail!,
      name: s.userName!,
      projectId: s.projectId,
      kind,
      accessToken: s.accessToken,
    });
    await reply(send, chatId, doc.markdown || `(${kind} vazio)`, docsKeyboard());
    return s;
  }
  await reply(send, chatId, helpText(session));
  return session;
}

async function handleText(
  text: string,
  session: TelegramSession,
  chatId: number,
  send: TelegramSend,
): Promise<TelegramSession> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "/start" || lower.startsWith("/start ")) {
    if (isLoggedIn(session)) return showHome(send, chatId, session);
    await reply(send, chatId, "Bem-vindo ao IdeiaMap. Entre com sua conta ou peça ajuda.", guestKeyboard());
    return await saveTelegramSession({ ...session, state: "guest" });
  }

  if (session.state === "await_email") {
    if (!trimmed.includes("@")) {
      await reply(send, chatId, "E-mail inválido. Digite de novo:");
      return session;
    }
    const next = await saveTelegramSession({ ...session, state: "await_password", emailDraft: trimmed });
    await reply(send, chatId, "Agora a senha:");
    return next;
  }

  if (session.state === "await_password") {
    try {
      const auth = await telegramLogin(session.emailDraft ?? "", trimmed);
      const next = await saveTelegramSession({
        telegramUserId: session.telegramUserId,
        state: "home",
        userId: auth.session.user.id,
        userEmail: auth.session.user.email,
        userName: auth.session.user.name,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        updatedAt: new Date().toISOString(),
      });
      await reply(send, chatId, `Login ok. Olá, ${next.userName}.`, homeKeyboard());
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no login.";
      const next = await saveTelegramSession({ ...session, state: "await_email", emailDraft: undefined });
      await reply(send, chatId, `${message}\nDigite o e-mail de novo, ou /start.`, guestKeyboard());
      return next;
    }
  }

  if (session.state === "await_project_name") {
    const s = await requireUser(session);
    const next = await saveTelegramSession({
      ...s,
      state: "await_project_idea",
      emailDraft: trimmed.slice(0, 120),
    });
    await reply(send, chatId, "Descreva a ideia do projeto em poucas linhas:");
    return next;
  }

  if (session.state === "await_project_idea") {
    const s = await requireUser(session);
    const name = (s.emailDraft ?? "Novo projeto").trim();
    const project = await createUserProject({
      userId: s.userId!,
      email: s.userEmail!,
      name: s.userName!,
      projectName: name,
      description: trimmed,
      accessToken: s.accessToken,
    });
    const next = await saveTelegramSession({
      ...s,
      state: "project",
      projectId: project.id,
      emailDraft: undefined,
    });
    await reply(send, chatId, `Projeto criado: ${project.name}`, projectKeyboard());
    return next;
  }

  if (!isLoggedIn(session)) {
    if (lower.includes("entrar") || lower === "login") {
      return handleCallback("login", session, chatId, send);
    }
    if (lower.includes("ajuda") || lower === "help") {
      return handleCallback("help", session, chatId, send);
    }
    await reply(send, chatId, helpText(session), guestKeyboard());
    return session;
  }

  if (lower === "sair" || lower === "logout" || lower === "/logout") {
    return handleCallback("logout", session, chatId, send);
  }
  if (lower === "ajuda" || lower === "help" || lower === "/help") {
    await reply(send, chatId, helpText(session), homeKeyboard());
    return session;
  }
  if (lower.includes("projeto") && (lower.includes("meu") || lower === "projetos" || lower.includes("lista"))) {
    return showProjects(send, chatId, session);
  }
  if (lower === "projetos" || lower === "meus projetos") {
    return showProjects(send, chatId, session);
  }
  if (lower === "novo" || lower.includes("novo projeto")) {
    return handleCallback("new", session, chatId, send);
  }
  if (lower === "voltar" || lower === "inicio" || lower === "início" || lower === "home") {
    return showHome(send, chatId, session);
  }
  if (session.projectId && (lower.includes("gera") || lower.includes("gerar"))) {
    return handleCallback("doc:gen", session, chatId, send);
  }
  if (session.projectId && lower.startsWith("ler ")) {
    const kind = lower.slice(4).trim() as ArtifactKind;
    if (READ_KINDS.has(kind)) return handleCallback(`doc:read:${kind}`, session, chatId, send);
  }
  if (lower.startsWith("abre ") || lower.startsWith("abrir ")) {
    const needle = trimmed.slice(trimmed.indexOf(" ") + 1).trim().toLowerCase();
    const projects = await listUserProjects({
      userId: session.userId!,
      email: session.userEmail!,
      name: session.userName!,
      accessToken: session.accessToken,
    });
    const hit = projects.find((p) => p.name.toLowerCase().includes(needle));
    if (hit) return openProject(send, chatId, session, hit.id);
    await reply(send, chatId, `Não achei projeto com “${needle}”.`, homeKeyboard());
    return session;
  }

  await reply(send, chatId, helpText(session), session.state === "project" ? projectKeyboard() : homeKeyboard());
  return session;
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  deps: { send?: TelegramSend; answer?: TelegramAnswer } = {},
): Promise<void> {
  const send: TelegramSend =
    deps.send ??
    (async (opts) => {
      await sendTelegramMessage(opts);
    });
  const answer: TelegramAnswer =
    deps.answer ??
    (async (opts) => {
      await answerCallbackQuery(opts);
    });

  try {
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat.id;
      if (chatId == null) return;
      await answer({ callbackQueryId: cq.id });
      const session = await getTelegramSession(cq.from.id);
      await handleCallback(cq.data ?? "", session, chatId, send);
      return;
    }
    const message = update.message;
    if (!message?.from || message.chat.id == null) return;
    const session = await getTelegramSession(message.from.id);
    const text = message.text?.trim() ?? "";
    if (!text) {
      await reply(send, message.chat.id, "Envie texto ou use os botões.", guestKeyboard());
      return;
    }
    await handleText(text, session, message.chat.id, send);
  } catch (err) {
    const chatId =
      update.callback_query?.message?.chat.id ?? update.message?.chat.id ?? null;
    if (chatId == null) return;
    const message = err instanceof Error ? err.message : "Algo falhou.";
    await reply(send, chatId, message);
  }
}

/** Teclado de teste / export para ACs. */
export function mainActionButtons(): InlineButton[] {
  return [
    { text: "Meus projetos", callback_data: "projects" },
    { text: "Novo projeto", callback_data: "new" },
    { text: "Sair", callback_data: "logout" },
  ];
}

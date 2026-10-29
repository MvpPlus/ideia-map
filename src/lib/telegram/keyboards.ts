import { inlineKeyboard, type InlineButton } from "@/lib/telegram/api";
import type { Project } from "@/lib/types";

export function guestKeyboard() {
  return inlineKeyboard([
    [
      { text: "Entrar", callback_data: "login" },
      { text: "Ajuda", callback_data: "help" },
    ],
  ]);
}

export function homeKeyboard() {
  return inlineKeyboard([
    [{ text: "Meus projetos", callback_data: "projects" }],
    [{ text: "Novo projeto", callback_data: "new" }],
    [{ text: "Sair", callback_data: "logout" }],
  ]);
}

export function projectsKeyboard(projects: Project[]) {
  const rows: InlineButton[][] = projects.slice(0, 12).map((p) => [
    { text: p.name.slice(0, 40), callback_data: `proj:${p.id}` },
  ]);
  rows.push([{ text: "Voltar", callback_data: "home" }]);
  return inlineKeyboard(rows);
}

export function projectKeyboard() {
  return inlineKeyboard([
    [{ text: "Entrevista / PRD", callback_data: "step:interview" }],
    [{ text: "Documentos", callback_data: "step:docs" }],
    [{ text: "Resumo do projeto", callback_data: "step:summary" }],
    [
      { text: "Projetos", callback_data: "projects" },
      { text: "Início", callback_data: "home" },
    ],
  ]);
}

export function docsKeyboard() {
  return inlineKeyboard([
    [{ text: "Gerar próximo documento", callback_data: "doc:gen" }],
    [{ text: "Ler TRD", callback_data: "doc:read:trd" }],
    [{ text: "Ler Fluxo", callback_data: "doc:read:flow" }],
    [{ text: "Ler Backend", callback_data: "doc:read:backend" }],
    [{ text: "Ler Plano", callback_data: "doc:read:plan" }],
    [{ text: "Voltar ao projeto", callback_data: "proj:back" }],
  ]);
}

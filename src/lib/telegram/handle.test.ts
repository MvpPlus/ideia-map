import { handleTelegramUpdate } from "@/lib/telegram/handle";
import { homeKeyboard } from "@/lib/telegram/keyboards";
import { resetTelegramDbForTests } from "@/lib/telegram/server-db";
import {
  getTelegramSession,
  resetTelegramSessionsForTests,
} from "@/lib/telegram/session";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("specs/020-telegram-bot FSM", () => {
  beforeEach(() => {
    resetTelegramSessionsForTests();
    resetTelegramDbForTests();
    vi.stubEnv("DATA_SOURCE", "mock");
  });

  it("AC-3 login e-mail/senha leva ao home com userId", async () => {
    const sent: { text: string; markup?: unknown }[] = [];
    const send = async (opts: {
      chatId: number;
      text: string;
      replyMarkup?: unknown;
    }) => {
      sent.push({ text: opts.text, markup: opts.replyMarkup });
    };

    await handleTelegramUpdate(
      {
        message: {
          message_id: 1,
          text: "/start",
          chat: { id: 10 },
          from: { id: 99, first_name: "T" },
        },
      },
      { send },
    );
    await handleTelegramUpdate(
      {
        callback_query: {
          id: "cq1",
          data: "login",
          from: { id: 99 },
          message: { chat: { id: 10 }, message_id: 2 },
        },
      },
      { send, answer: async () => undefined },
    );
    await handleTelegramUpdate(
      {
        message: {
          message_id: 3,
          text: "marina@estudio.dev",
          chat: { id: 10 },
          from: { id: 99 },
        },
      },
      { send },
    );
    await handleTelegramUpdate(
      {
        message: {
          message_id: 4,
          text: "mapa",
          chat: { id: 10 },
          from: { id: 99 },
        },
      },
      { send },
    );

    const session = await getTelegramSession(99);
    expect(session.userId).toBeTruthy();
    expect(session.userEmail).toBe("marina@estudio.dev");
    expect(session.state).toBe("home");
    expect(sent.at(-1)?.markup).toEqual(homeKeyboard());
  });

  it("AC-4 Meus projetos lista só do dono e logout limpa", async () => {
    const sent: { text: string; markup?: { inline_keyboard: { callback_data: string }[][] } }[] =
      [];
    const send = async (opts: {
      chatId: number;
      text: string;
      replyMarkup?: { inline_keyboard: { callback_data: string }[][] };
    }) => {
      sent.push({ text: opts.text, markup: opts.replyMarkup });
    };
    const answer = async () => undefined;

    for (const text of ["/start", "marina@estudio.dev", "mapa"]) {
      if (text === "/start") {
        await handleTelegramUpdate(
          {
            message: {
              message_id: 1,
              text: "/start",
              chat: { id: 10 },
              from: { id: 77 },
            },
          },
          { send },
        );
        await handleTelegramUpdate(
          {
            callback_query: {
              id: "l",
              data: "login",
              from: { id: 77 },
              message: { chat: { id: 10 }, message_id: 2 },
            },
          },
          { send, answer },
        );
        continue;
      }
      await handleTelegramUpdate(
        {
          message: {
            message_id: 3,
            text,
            chat: { id: 10 },
            from: { id: 77 },
          },
        },
        { send },
      );
    }

    await handleTelegramUpdate(
      {
        callback_query: {
          id: "p",
          data: "projects",
          from: { id: 77 },
          message: { chat: { id: 10 }, message_id: 5 },
        },
      },
      { send, answer },
    );

    const last = sent.at(-1);
    const callbacks = last?.markup?.inline_keyboard.flat().map((b) => b.callback_data) ?? [];
    expect(callbacks.some((c) => c.startsWith("proj:"))).toBe(true);
    expect((await getTelegramSession(77)).userId).toBeTruthy();

    await handleTelegramUpdate(
      {
        callback_query: {
          id: "out",
          data: "logout",
          from: { id: 77 },
          message: { chat: { id: 10 }, message_id: 6 },
        },
      },
      { send, answer },
    );
    expect((await getTelegramSession(77)).userId).toBeUndefined();
    expect((await getTelegramSession(77)).state).toBe("guest");
  });

  it("AC-5 texto livre ajuda no home", async () => {
    const sent: string[] = [];
    const send = async (opts: { text: string }) => {
      sent.push(opts.text);
    };
    await handleTelegramUpdate(
      {
        message: {
          message_id: 1,
          text: "/start",
          chat: { id: 1 },
          from: { id: 5 },
        },
      },
      { send },
    );
    await handleTelegramUpdate(
      {
        message: {
          message_id: 2,
          text: "ajuda",
          chat: { id: 1 },
          from: { id: 5 },
        },
      },
      { send },
    );
    expect(sent.at(-1)?.toLowerCase()).toContain("ideiamap");
  });
});

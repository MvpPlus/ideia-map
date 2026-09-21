"use client";

import { bootstrapDataSource, dataRepository, isSupabaseMode } from "@/lib/data";
import { supabaseSignIn, supabaseSignOut, supabaseSignUp } from "@/lib/supabase/auth-client";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import type { DataRepository } from "@/lib/data/repository";
import type {
  AiSettings,
  DatabaseSnapshot,
  ExportTarget,
  Plan,
  Project,
  Session,
  User,
} from "@/lib/types";
import { useMemo } from "react";
import { create } from "zustand";

type Toast = { id: string; text: string };

type AppState = {
  hydrated: boolean;
  session: Session | null;
  db: DatabaseSnapshot | null;
  toasts: Toast[];
  hydrate: () => Promise<void>;
  toast: (text: string) => void;
  dismissToast: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => void;
  refresh: () => void;
  repo: () => DataRepository;
};

function snap() {
  const repo = dataRepository();
  const session = repo.getSession();
  return {
    session: session ? { user: { ...session.user, preferences: { ...session.user.preferences } } } : null,
    db: structuredClone(repo.getDb()),
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  session: null,
  db: null,
  toasts: [],
  repo: () => dataRepository(),
  hydrate: async () => {
    await bootstrapDataSource();
    set({ hydrated: true, ...snap() });
  },
  refresh: () => set(snap()),
  toast: (text) => {
    const id = `${Date.now()}`;
    set((s) => ({ toasts: [...s.toasts, { id, text }] }));
    window.setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  login: async (email, password) => {
    if (isSupabaseMode()) {
      await supabaseSignIn(email, password);
      await getSupabaseAdapter().reload();
    } else {
      dataRepository().login(email, password);
    }
    set(snap());
  },
  signup: async (name, email, password) => {
    if (isSupabaseMode()) {
      await supabaseSignUp(name, email, password);
      await getSupabaseAdapter().reload();
    } else {
      dataRepository().signup(name, email, password);
    }
    set(snap());
  },
  logout: async () => {
    if (isSupabaseMode()) {
      await supabaseSignOut();
      getSupabaseAdapter().logout();
      await getSupabaseAdapter().reload();
    } else {
      dataRepository().logout();
    }
    set(snap());
  },
  requestPasswordReset: (email) => {
    dataRepository().requestPasswordReset(email);
  },
}));

export function useProjects(): Project[] {
  const db = useAppStore((s) => s.db);
  const userId = useAppStore((s) => s.session?.user.id);
  if (!db || !userId) return [];
  return db.projects
    .filter((p) => p.user_id === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function useProjectBundle(projectId: string) {
  const db = useAppStore((s) => s.db);
  return useMemo(() => {
    const project = db?.projects.find((p) => p.id === projectId);
    const requirements = db?.requirements.filter((r) => r.project_id === projectId) ?? [];
    const screens = db?.screens.filter((s) => s.project_id === projectId) ?? [];
    const chat =
      db?.chat_messages.filter((m) => m.project_id === projectId && m.context === "overview") ?? [];
    const versions = db?.project_versions.filter((v) => v.project_id === projectId) ?? [];
    const exports = db?.exports.filter((e) => e.project_id === projectId) ?? [];
    const analyses = db?.analyses?.filter((a) => a.project_id === projectId) ?? [];
    const competitors = db?.competitors?.filter((c) => c.project_id === projectId) ?? [];
    const personas = db?.personas?.filter((p) => p.project_id === projectId) ?? [];
    const dataModels = db?.data_models?.filter((m) => m.project_id === projectId) ?? [];
    const fetches = db?.url_fetches?.filter((f) => f.project_id === projectId) ?? [];
    const latestVersion = versions.reduce((max, v) => Math.max(max, v.number), 0);
    return {
      project,
      requirements,
      screens,
      chat,
      versions,
      exports,
      latestVersion,
      analysis: analyses[0],
      competitors,
      personas,
      dataModel: dataModels[0],
      urlFetch: fetches.at(-1),
    };
  }, [db, projectId]);
}

export function maskKey(key: string): string {
  if (key.length < 8) return "••••";
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

export type { ExportTarget, Plan, User, AiSettings };

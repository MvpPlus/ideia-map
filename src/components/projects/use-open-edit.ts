"use client";

import { dataRepository, isSupabaseMode } from "@/lib/data";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";

/** Editar projeto: volta o status para rascunho e abre as informações iniciais (spec 011, AC-4 e AC-5). */
export function useOpenProjectEdit() {
  const router = useRouter();
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  return async (projectId: string) => {
    try {
      dataRepository().reopenProjectAsDraft(projectId);
      if (isSupabaseMode()) await getSupabaseAdapter().persistNow();
      refresh();
      router.push(`/projects/${projectId}/edit`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Não foi possível abrir a edição.");
    }
  };
}

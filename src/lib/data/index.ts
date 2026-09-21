import { getRepository } from "@/lib/data/mock-adapter";
import { getSupabaseAdapter } from "@/lib/data/supabase-adapter";
import type { DataRepository } from "@/lib/data/repository";
import { assertNoServiceRoleInPublicEnv, isSupabaseDataSource } from "@/lib/supabase/env";

const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? process.env.DATA_SOURCE ?? "mock";

export function isSupabaseMode(): boolean {
  return source === "supabase";
}

export async function bootstrapDataSource(): Promise<void> {
  assertNoServiceRoleInPublicEnv();
  if (!isSupabaseDataSource()) return;
  if (typeof window === "undefined") return;
  await getSupabaseAdapter().reload();
}

export function dataRepository(): DataRepository {
  if (source === "supabase") {
    return getSupabaseAdapter();
  }
  if (source !== "mock") {
    throw new Error(`DATA_SOURCE desconhecido: ${source}`);
  }
  return getRepository();
}

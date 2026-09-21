import type { Session } from "@/lib/types";

export const LOGIN_PATH = "/login";

/** AC-2: autenticado em `/` vai ao dashboard. */
export function landingRedirect(session: Session | null): "/dashboard" | null {
  return session ? "/dashboard" : null;
}

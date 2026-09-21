import { landingRedirect } from "@/lib/landing";
import type { Session } from "@/lib/types";
import { describe, expect, it } from "vitest";

const session = { user: { id: "u1" } } as Session;

describe("specs/004-landing", () => {
  it("AC-2 Sessão redireciona", () => {
    expect(landingRedirect(session)).toBe("/dashboard");
    expect(landingRedirect(null)).toBeNull();
  });
});

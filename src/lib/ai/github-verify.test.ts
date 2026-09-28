import { githubLookup, githubRepoName, verifyPrdResources, type RepoLookup } from "@/lib/ai/github-verify";
import type { PrdResources } from "@/lib/ai/prd";
import { describe, expect, it, vi } from "vitest";

const resources: PrdResources = {
  skills: [
    { name: "skill real", url: "https://github.com/vercel-labs/agent-skills/tree/main/skills/react", why: "" },
    { name: "skill fora do GitHub", url: "https://skills.sh/x", why: "" },
  ],
  repos: [
    { name: "existe", url: "https://github.com/Supabase/Supabase", why: "" },
    { name: "inventado", url: "https://github.com/fake/nao-existe", why: "" },
    { name: "arquivado", url: "https://github.com/old/archived", why: "" },
    { name: "sem resposta", url: "https://github.com/slow/repo", why: "" },
  ],
  services: [
    { name: "Supabase", url: "https://supabase.com", why: "", free_tier: "500 MB", pricing: "https://supabase.com/pricing" },
  ],
};

const lookup: RepoLookup = async (fullName) => {
  if (fullName === "supabase/supabase") return { exists: true, url: "https://github.com/supabase/supabase" };
  if (fullName === "vercel-labs/agent-skills") return { exists: true };
  if (fullName === "old/archived") return { exists: true, archived: true };
  if (fullName === "slow/repo") return null;
  return { exists: false };
};

describe("specs/014-entrevista-prd", () => {
  it("AC-11 Extrai dono/repo de links do GitHub", () => {
    expect(githubRepoName("https://github.com/Vercel/Next.js/tree/canary")).toBe("vercel/next.js");
    expect(githubRepoName("https://www.github.com/a/b.git")).toBe("a/b");
    expect(githubRepoName("https://github.com/vercel")).toBeNull();
    expect(githubRepoName("https://gitlab.com/a/b")).toBeNull();
  });

  it("AC-11 Remove repositório inexistente ou arquivado e mantém o que não respondeu", async () => {
    const verified = await verifyPrdResources(resources, lookup);
    expect(verified.repos.map((r) => r.name)).toEqual(["existe", "sem resposta"]);
    expect(verified.repos[0]?.url).toBe("https://github.com/supabase/supabase");
  });

  it("AC-11 Verifica skills no GitHub e não consulta links de fora", async () => {
    const spy = vi.fn(lookup);
    const verified = await verifyPrdResources(resources, spy);
    expect(verified.skills.map((s) => s.name)).toEqual(["skill real", "skill fora do GitHub"]);
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("skills.sh"));
    expect(verified.services).toEqual(resources.services);
  });

  it("AC-11 Consulta a API pública do GitHub e trata 404", async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.endsWith("/repos/a/b")
        ? new Response(JSON.stringify({ html_url: "https://github.com/a/b", archived: false }), { status: 200 })
        : new Response("", { status: 404 }),
    );
    const check = githubLookup(fetcher as unknown as typeof fetch);
    expect(await check("a/b")).toEqual({ exists: true, url: "https://github.com/a/b", archived: false });
    expect(await check("x/y")).toEqual({ exists: false });
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/a/b");
  });

  it("AC-11 Limite de taxa do GitHub não derruba o item", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 403 }));
    expect(await githubLookup(fetcher as unknown as typeof fetch)("a/b")).toBeNull();
  });
});

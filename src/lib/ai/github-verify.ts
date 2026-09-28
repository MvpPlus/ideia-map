import type { PrdResource, PrdResources } from "@/lib/ai/prd";

export type RepoCheck = { exists: boolean; url?: string; archived?: boolean };
/** `null` quando o GitHub não respondeu (timeout, limite de taxa): o item fica. */
export type RepoLookup = (fullName: string) => Promise<RepoCheck | null>;

export function githubRepoName(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) return null;
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return `${owner}/${repo.replace(/\.git$/i, "")}`.toLowerCase();
  } catch {
    return null;
  }
}

export function githubLookup(fetcher: typeof fetch = fetch, token = process.env.GITHUB_TOKEN): RepoLookup {
  return async (fullName) => {
    try {
      const response = await fetcher(`https://api.github.com/repos/${fullName}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ideiamap",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(4000),
      });
      if (response.status === 404) return { exists: false };
      if (!response.ok) return null;
      const data = (await response.json()) as { html_url?: string; archived?: boolean };
      return { exists: true, url: data.html_url, archived: Boolean(data.archived) };
    } catch {
      return null;
    }
  };
}

async function keepExisting<T extends PrdResource>(items: T[], lookup: RepoLookup): Promise<T[]> {
  const checked = await Promise.all(
    items.map(async (item) => {
      const fullName = githubRepoName(item.url);
      if (!fullName) return item;
      const check = await lookup(fullName);
      if (!check) return item;
      if (!check.exists || check.archived) return null;
      const isRepoRoot = new URL(item.url).pathname.split("/").filter(Boolean).length <= 2;
      return check.url && isRepoRoot ? { ...item, url: check.url } : item;
    }),
  );
  return checked.filter((item): item is Awaited<T> => item !== null);
}

export async function verifyPrdResources(resources: PrdResources, lookup: RepoLookup): Promise<PrdResources> {
  const [skills, repos] = await Promise.all([
    keepExisting(resources.skills, lookup),
    keepExisting(resources.repos, lookup),
  ]);
  return { skills, repos, services: resources.services };
}

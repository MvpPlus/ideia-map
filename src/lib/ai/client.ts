async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Erro ${response.status}`;
  } catch {
    return `Erro ${response.status}`;
  }
}

export async function requestAi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export type CatalogProvider = "openrouter" | "google" | "groq" | "mistral" | "cloudflare";

export type CatalogModel = {
  id: string;
  name: string;
  provider?: CatalogProvider;
};

export function isFreeModel(model: {
  id: string;
  pricing?: { prompt?: string; completion?: string };
}): boolean {
  if (model.id.includes(":free")) return true;
  const prompt = Number(model.pricing?.prompt);
  const completion = Number(model.pricing?.completion ?? 0);
  return prompt === 0 && completion === 0;
}

export function inferCatalogProvider(id: string): CatalogProvider {
  const value = id.trim();
  if (value.startsWith("@cf/") || value.startsWith("cloudflare:")) return "cloudflare";
  if (value.startsWith("google:") || /^gemini-[\w.-]+$/i.test(value)) return "google";
  if (value.startsWith("groq:")) return "groq";
  if (value.startsWith("mistral:")) return "mistral";
  if (/^llama-[\w.-]+$/i.test(value) || /^gemma2?-[\w.-]+$/i.test(value) || /^mixtral/i.test(value)) {
    return "groq";
  }
  if (/^mistral/i.test(value) || /^open-mistral/i.test(value) || /^codestral/i.test(value)) {
    return "mistral";
  }
  return "openrouter";
}

export function catalogLabel(model: CatalogModel): string {
  const provider = model.provider ?? inferCatalogProvider(model.id);
  if (provider === "google") return `Google Ai Studio: ${model.name}`;
  if (provider === "groq") return `Groq: ${model.name}`;
  if (provider === "mistral") return `Mistral: ${model.name}`;
  if (provider === "cloudflare") return `Cloudflare: ${model.name}`;
  return `Openrouter: ${model.name}`;
}

export function mergeModelCatalog(
  openrouter: { id: string; name: string }[],
  google: { id: string; name: string }[],
  groq: { id: string; name: string }[] = [],
  mistral: { id: string; name: string }[] = [],
  cloudflare: { id: string; name: string }[] = [],
): CatalogModel[] {
  return [
    ...openrouter.map((m) => ({ id: m.id, name: m.name, provider: "openrouter" as const })),
    ...google.map((m) => ({ id: m.id, name: m.name, provider: "google" as const })),
    ...groq.map((m) => ({ id: m.id, name: m.name, provider: "groq" as const })),
    ...mistral.map((m) => ({ id: m.id, name: m.name, provider: "mistral" as const })),
    ...cloudflare.map((m) => ({ id: m.id, name: m.name, provider: "cloudflare" as const })),
  ];
}

export function optionsForSlot(models: CatalogModel[], current: string): CatalogModel[] {
  if (!current.trim() || models.some((m) => m.id === current)) return models;
  return [{ id: current, name: current, provider: inferCatalogProvider(current) }, ...models];
}

export function providerDisplayName(provider: CatalogProvider | string): string {
  if (provider === "google") return "Google AI Studio";
  if (provider === "groq") return "Groq";
  if (provider === "mistral") return "Mistral";
  if (provider === "cloudflare") return "Cloudflare";
  return "OpenRouter";
}

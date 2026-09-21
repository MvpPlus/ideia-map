export type CatalogProvider = "openrouter" | "google";

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
  if (value.startsWith("google:")) return "google";
  if (/^gemini-[\w.-]+$/i.test(value)) return "google";
  return "openrouter";
}

export function catalogLabel(model: CatalogModel): string {
  const provider = model.provider ?? inferCatalogProvider(model.id);
  if (provider === "google") return `Google Ai Studio: ${model.name}`;
  return `Openrouter: ${model.name}`;
}

export function mergeModelCatalog(
  openrouter: { id: string; name: string }[],
  google: { id: string; name: string }[],
): CatalogModel[] {
  return [
    ...openrouter.map((m) => ({ id: m.id, name: m.name, provider: "openrouter" as const })),
    ...google.map((m) => ({ id: m.id, name: m.name, provider: "google" as const })),
  ];
}

export function optionsForSlot(models: CatalogModel[], current: string): CatalogModel[] {
  if (!current.trim() || models.some((m) => m.id === current)) return models;
  return [{ id: current, name: current, provider: inferCatalogProvider(current) }, ...models];
}

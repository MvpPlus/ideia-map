import { fetchPublicPage } from "@/lib/ai/fetch-url";
import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim() ?? "";
    if (!url) return NextResponse.json({ error: "Informe a URL." }, { status: 400 });
    const page = await fetchPublicPage(url);
    return NextResponse.json(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível coletar a URL.";
    const status = message.includes("privado") || message.includes("inválida") || message.includes("http") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

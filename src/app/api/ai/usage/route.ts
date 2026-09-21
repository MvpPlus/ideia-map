import { usageSnapshot } from "@/lib/ai/persist-usage";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(usageSnapshot());
}

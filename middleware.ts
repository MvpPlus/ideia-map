import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseDataSource } from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (!isSupabaseDataSource()) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

"use client";

import { Landing } from "@/components/landing";
import { landingRedirect } from "@/lib/landing";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const session = useAppStore((s) => s.session);
  const router = useRouter();

  useEffect(() => {
    const next = landingRedirect(session);
    if (next) router.replace(next);
  }, [session, router]);

  if (session) return null;

  return <Landing />;
}

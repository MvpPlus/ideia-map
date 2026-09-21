"use client";

import { AuthCard, AuthFrame } from "@/components/auth-frame";
import { IdeaRouteMap } from "@/components/idea-route-map";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const session = useAppStore((s) => s.session);
  const login = useAppStore((s) => s.login);
  const toast = useAppStore((s) => s.toast);
  const router = useRouter();
  const [email, setEmail] = useState("marina@estudio.dev");
  const [password, setPassword] = useState("mapa");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
      toast("Confira e-mail e senha.");
    }
  }

  return (
    <AuthFrame>
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <IdeaRouteMap />
          <div className="absolute bottom-10 left-10 max-w-sm">
            <p className="display text-4xl">Sua ideia, pronta para construir.</p>
            <p className="mt-3 text-sm text-mute">
              Briefing vira rota: telas, requisitos e um pacote para a IDE.
            </p>
          </div>
        </section>
        <section className="grid place-items-center px-6 py-12">
          <form onSubmit={onSubmit} className="w-full max-w-sm">
            <AuthCard title="Entrar" subtitle="Abra seus projetos no command center.">
              <Field label="E-mail">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Senha">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              {error ? <p className="text-sm text-marco">{error}</p> : null}
              <Button type="submit" className="w-full">
                Entrar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  login("marina@estudio.dev", "mapa");
                  router.push("/dashboard");
                }}
              >
                Abrir conta de demonstração
              </Button>
              <button
                type="button"
                className="w-full text-left text-xs text-mute underline"
                onClick={() => {
                  login("admin@ideiamap.dev", "mapa");
                  router.push("/admin");
                }}
              >
                Abrir painel admin
              </button>
              <div className="flex justify-between text-sm">
                <Link href="/signup" className="text-trail underline">
                  Criar conta
                </Link>
                <Link href="/forgot-password" className="text-mute underline">
                  Esqueci senha
                </Link>
              </div>
              <p className="text-xs text-mute">
                Admin: admin@ideiamap.dev · qualquer senha. Dados ficam neste navegador.
              </p>
            </AuthCard>
          </form>
        </section>
      </div>
    </AuthFrame>
  );
}

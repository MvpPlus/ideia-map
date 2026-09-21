"use client";

import { AuthCard, AuthFrame } from "@/components/auth-frame";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const signup = useAppStore((s) => s.signup);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await signup(name, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    }
  }

  return (
    <AuthFrame>
      <div className="grid min-h-screen place-items-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <AuthCard title="Criar conta" subtitle="Comece um mapa a partir do briefing.">
            <Field label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Senha">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error ? <p className="text-sm text-marco">{error}</p> : null}
            <Button type="submit" className="w-full">
              Criar e entrar
            </Button>
            <Link href="/login" className="block text-center text-sm text-trail underline">
              Já tenho conta
            </Link>
          </AuthCard>
        </form>
      </div>
    </AuthFrame>
  );
}

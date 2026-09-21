"use client";

import { AuthCard, AuthFrame } from "@/components/auth-frame";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const requestPasswordReset = useAppStore((s) => s.requestPasswordReset);
  const toast = useAppStore((s) => s.toast);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    requestPasswordReset(email);
    setSent(true);
    toast("Se este e-mail existir no mock, o link já teria saído.");
  }

  return (
    <AuthFrame>
      <div className="grid min-h-screen place-items-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <AuthCard
            title="Recuperar senha"
            subtitle="Nesta fase local não enviamos e-mail. O fluxo só registra o pedido."
          >
            <Field label="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Button type="submit" className="w-full">
              Enviar instruções
            </Button>
            {sent ? <p className="text-sm text-emerald">Pedido registrado neste navegador.</p> : null}
            <Link href="/" className="block text-center text-sm text-trail underline">
              Voltar ao início
            </Link>
          </AuthCard>
        </form>
      </div>
    </AuthFrame>
  );
}

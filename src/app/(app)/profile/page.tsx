"use client";

import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { dataRepository } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function ProfilePage() {
  const session = useAppStore((s) => s.session);
  const db = useAppStore((s) => s.db);
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [billingOpen, setBillingOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  const sub = db?.subscriptions.find((s) => s.user_id === session?.user.id);
  const plan = db?.plans.find((p) => p.id === sub?.plan_id);
  const txs = useMemo(
    () => db?.credit_transactions.filter((t) => t.user_id === session?.user.id) ?? [],
    [db, session],
  );
  const used = txs.reduce((sum, t) => sum + t.credits, 0);
  const remaining = Math.max(0, (plan?.credits_limit ?? 0) - used);

  const [name, setName] = useState(session?.user.name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [digest, setDigest] = useState(session?.user.preferences.digest ?? false);

  if (!session) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 py-2">
        <h1 className="display text-3xl lg:text-4xl">Perfil e assinatura</h1>
        <form
          className="card space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            dataRepository().updateProfile(session.user.id, {
              name,
              email,
              preferences: { locale: "pt-BR", digest },
            });
            refresh();
            toast("Perfil salvo.");
          }}
        >
          <h2 className="text-sm text-mute">Dados</h2>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={digest} onChange={(e) => setDigest(e.target.checked)} />
            Resumo semanal por e-mail (preferência mock)
          </label>
          <Button type="submit">Salvar perfil</Button>
        </form>

        <section className="card p-5">
          <h2 className="text-sm text-mute">Plano</h2>
          <p className="display mt-2 text-3xl">{plan?.name ?? "Sem plano"}</p>
          <p className="mt-1 text-sm text-mute">
            Até {plan?.project_limit ?? 0} projetos · {remaining} créditos restantes de {plan?.credits_limit ?? 0}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setBillingOpen(true)}>Gerenciar assinatura</Button>
            <Button variant="ghost" onClick={() => setPlansOpen(true)}>
              Alterar plano
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-sm text-mute">Histórico de consumo</h2>
          <ul className="card mt-3 divide-y divide-line">
            {txs.map((tx) => (
              <li key={tx.id} className="flex justify-between gap-4 px-3 py-3 text-sm">
                <span>
                  {tx.operation}
                  <span className="mt-1 block text-xs text-mute">{formatDate(tx.created_at)}</span>
                </span>
                <span>
                  {tx.credits} cr · R$ {tx.cost.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {billingOpen ? (
        <Modal title="Portal de cobrança" onClose={() => setBillingOpen(false)}>
          <p className="text-sm">
            No futuro este botão abre o portal do provedor. Agora só confirma que a ação existe.
          </p>
          <Button className="mt-4" onClick={() => setBillingOpen(false)}>
            Fechar
          </Button>
        </Modal>
      ) : null}

      {plansOpen ? (
        <Modal title="Alterar plano" onClose={() => setPlansOpen(false)}>
          <ul className="space-y-3">
            {db?.plans.map((item) => (
              <li key={item.id} className="card p-3">
                <p className="display text-xl">{item.name}</p>
                <p className="text-sm text-mute">
                  {item.project_limit} projetos · {item.credits_limit} créditos · R$ {item.price}
                </p>
                <Button
                  className="mt-2"
                  variant="ghost"
                  onClick={() => {
                    toast(`Pedido de mudança para ${item.name} registrado (mock).`);
                    setPlansOpen(false);
                  }}
                >
                  Escolher
                </Button>
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}
    </AppShell>
  );
}

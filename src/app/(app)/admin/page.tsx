"use client";

import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, fieldClass, Input, Select, Textarea } from "@/components/ui/input";
import { catalogLabel, optionsForSlot } from "@/lib/ai/model-options";
import { dataRepository } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import type { AiSettings, Plan, PromptTemplate, User } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";

const tabs = [
  "Usuários",
  "Planos",
  "Jobs",
  "Templates",
  "Auditoria",
  "Custos",
  "Consumo",
  "OpenRouter",
] as const;

export default function AdminPage() {
  const session = useAppStore((s) => s.session);
  const db = useAppStore((s) => s.db);
  const [tab, setTab] = useState<(typeof tabs)[number]>("OpenRouter");

  useEffect(() => {
    if (session && session.user.role !== "admin") {
      window.location.replace("/dashboard");
    }
  }, [session]);

  if (!session || session.user.role !== "admin" || !db) {
    return <div className="p-8 text-sm text-mute">Só contas admin entram aqui.</div>;
  }

  return (
    <AppShell>
      <div className="py-2">
        <h1 className="display text-3xl lg:text-4xl">Administração</h1>
        <div className="mt-6 flex flex-nowrap gap-1 overflow-x-auto border-b border-line">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              className={`min-h-11 shrink-0 px-3 py-2 text-sm ${tab === item ? "border-b-2 border-trail" : "text-mute"}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-6">
          {tab === "Usuários" ? <UsersPanel users={db.users} /> : null}
          {tab === "Planos" ? <PlansPanel plans={db.plans} /> : null}
          {tab === "Jobs" ? <JobsPanel /> : null}
          {tab === "Templates" ? <TemplatesPanel templates={db.prompt_templates} /> : null}
          {tab === "Auditoria" ? <AuditPanel /> : null}
          {tab === "Custos" ? <CostsPanel /> : null}
          {tab === "Consumo" ? <UsagePanel /> : null}
          {tab === "OpenRouter" ? <OpenRouterPanel settings={db.ai_settings} /> : null}
        </div>
      </div>
    </AppShell>
  );
}

function UsersPanel({ users }: { users: User[] }) {
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  return (
    <ul className="card divide-y divide-line">
      {users.map((user) => (
        <li key={user.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_140px_auto] sm:items-center">
          <div>
            <p>{user.name}</p>
            <p className="text-xs text-mute">{user.email}</p>
          </div>
          <select
            className={`${fieldClass} px-2 py-2 text-sm`}
            value={user.role}
            onChange={(e) => {
              dataRepository().updateUser({ ...user, role: e.target.value as User["role"] });
              refresh();
              toast("Papel atualizado.");
            }}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <span className="text-xs text-mute">{user.id}</span>
        </li>
      ))}
    </ul>
  );
}

function PlansPanel({ plans }: { plans: Plan[] }) {
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [drafts, setDrafts] = useState(plans);
  return (
    <div className="space-y-4">
      {drafts.map((plan, index) => (
        <form
          key={plan.id}
          className="card grid gap-2 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            dataRepository().updatePlan(plan);
            refresh();
            toast("Plano salvo.");
          }}
        >
          <Field label="Nome">
            <Input
              value={plan.name}
              onChange={(e) => {
                const next = [...drafts];
                next[index] = { ...plan, name: e.target.value };
                setDrafts(next);
              }}
            />
          </Field>
          <Field label="Preço">
            <Input
              type="number"
              value={plan.price}
              onChange={(e) => {
                const next = [...drafts];
                next[index] = { ...plan, price: Number(e.target.value) };
                setDrafts(next);
              }}
            />
          </Field>
          <Field label="Limite de projetos">
            <Input
              type="number"
              value={plan.project_limit}
              onChange={(e) => {
                const next = [...drafts];
                next[index] = { ...plan, project_limit: Number(e.target.value) };
                setDrafts(next);
              }}
            />
          </Field>
          <Field label="Créditos">
            <Input
              type="number"
              value={plan.credits_limit}
              onChange={(e) => {
                const next = [...drafts];
                next[index] = { ...plan, credits_limit: Number(e.target.value) };
                setDrafts(next);
              }}
            />
          </Field>
          <Button type="submit">Salvar plano</Button>
        </form>
      ))}
    </div>
  );
}

function JobsPanel() {
  const db = useAppStore((s) => s.db);
  return (
    <ul className="card divide-y divide-line">
      {db?.jobs.map((job) => (
        <li key={job.id} className="px-3 py-3 text-sm">
          <p>
            {job.type} · {job.status}
          </p>
          <p className="text-xs text-mute">
            {job.project_id ?? "global"} {job.error ? `· ${job.error}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

function TemplatesPanel({ templates }: { templates: PromptTemplate[] }) {
  const [openId, setOpenId] = useState<string | null>(templates[0]?.id ?? null);
  const current = templates.find((t) => t.id === openId);
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <ul className="card">
        {templates.map((tpl) => (
          <li key={tpl.id}>
            <button
              type="button"
              className={`block w-full px-3 py-2 text-left text-sm ${openId === tpl.id ? "bg-canvas" : ""}`}
              onClick={() => setOpenId(tpl.id)}
            >
              {tpl.name}
              <span className="mt-1 block text-xs text-mute">
                v{tpl.version} {tpl.is_published ? "publicado" : "rascunho"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <div className="space-y-2">
          <Textarea readOnly value={current.content} className="min-h-40" />
          <Button
            variant="ghost"
            onClick={() => {
              useAppStore.getState().toast("Teste mock: o prompt rodaria no modelo de chat selecionado.");
            }}
          >
            Testar prompt
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AuditPanel() {
  const db = useAppStore((s) => s.db);
  return (
    <ul className="card divide-y divide-line">
      {db?.audit_logs.map((log) => (
        <li key={log.id} className="px-3 py-3 text-sm">
          <p>{log.action}</p>
          <p className="text-xs text-mute">
            {formatDate(log.created_at)} · {JSON.stringify(log.details)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function CostsPanel() {
  const db = useAppStore((s) => s.db);
  const total = db?.cost_entries.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  return (
    <div>
      <p className="display text-3xl">R$ {total.toFixed(2)}</p>
      <p className="text-sm text-mute">Soma do período em seed (agosto 2026).</p>
      <ul className="card mt-4 divide-y divide-line">
        {db?.cost_entries.map((entry) => (
          <li key={entry.id} className="flex justify-between px-3 py-3 text-sm">
            <span>
              {entry.description}
              <span className="mt-1 block text-xs text-mute">{entry.type}</span>
            </span>
            <span>R$ {entry.amount.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PURPOSE_LABEL: Record<string, string> = {
  plan: "Planejamento",
  chat: "Chat",
  analysis: "Análise",
  competitive: "Radar de mercado",
  personas: "Personas",
  database: "Banco",
  "web-search": "Busca na web",
  ia: "IA",
};

function formatUsd(value: number) {
  const digits = value > 0 && value < 0.01 ? 6 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function UsagePanel() {
  const [data, setData] = useState<{
    events: {
      id: string;
      at: string;
      provider: string;
      model: string;
      purpose: string;
      promptTokens: number;
      completionTokens: number;
      estimatedUsd: number;
    }[];
    summary: {
      calls: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedUsd: number;
      byModel: { model: string; provider: string; calls: number; tokens: number; estimatedUsd: number }[];
      byProvider: { provider: string; calls: number; tokens: number; estimatedUsd: number }[];
    };
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ai/usage")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Não deu para ler o consumo."));
  }, []);

  if (error) return <p className="text-sm text-marco">{error}</p>;
  if (!data) return <p className="text-sm text-mute">Carregando consumo…</p>;

  const { summary, events } = data;

  return (
    <div className="space-y-6">
      <p className="text-sm text-mute">
        Estimativa de tabela (USD). Quota gratuita do Google AI Studio pode sair a US$ 0 na fatura real. As chamadas
        deste servidor ficam em arquivo local, não no navegador.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Chamadas", String(summary.calls)],
          ["Tokens de entrada", summary.promptTokens.toLocaleString("pt-BR")],
          ["Tokens de saída", summary.completionTokens.toLocaleString("pt-BR")],
          ["Gasto estimado", formatUsd(summary.estimatedUsd)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-[11px] uppercase tracking-wide text-mute">{label}</p>
            <p className="display mt-1 text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-sm text-mute">Por modelo</h2>
        {summary.byModel.length === 0 ? (
          <p className="mt-2 text-sm text-mute">Ainda não houve chamada de IA neste servidor.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-line">
            {summary.byModel.map((row) => (
              <li key={`${row.provider}:${row.model}`} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-3 text-sm">
                <span>
                  {row.model}
                  <span className="mt-1 block text-xs text-mute">
                    {row.provider} · {row.calls} chamada{row.calls === 1 ? "" : "s"} · {row.tokens.toLocaleString("pt-BR")} tokens
                  </span>
                </span>
                <span>{formatUsd(row.estimatedUsd)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="text-sm text-mute">Por provedor</h2>
        <ul className="card mt-2 divide-y divide-line">
          {summary.byProvider.map((row) => (
            <li key={row.provider} className="flex justify-between px-3 py-3 text-sm">
              <span>
                {row.provider === "google" ? "Google AI Studio" : "OpenRouter"}
                <span className="mt-1 block text-xs text-mute">
                  {row.calls} chamada{row.calls === 1 ? "" : "s"} · {row.tokens.toLocaleString("pt-BR")} tokens
                </span>
              </span>
              <span>{formatUsd(row.estimatedUsd)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-sm text-mute">Chamadas recentes</h2>
        <ul className="card mt-2 divide-y divide-line">
          {events.slice(0, 40).map((event) => (
            <li key={event.id} className="px-3 py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span>{event.model}</span>
                <span>{formatUsd(event.estimatedUsd)}</span>
              </div>
              <p className="mt-1 text-xs text-mute">
                {formatWhen(event.at)} · {event.provider} · {PURPOSE_LABEL[event.purpose] ?? event.purpose} ·{" "}
                {event.promptTokens.toLocaleString("pt-BR")} in / {event.completionTokens.toLocaleString("pt-BR")} out
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OpenRouterPanel({ settings }: { settings: AiSettings }) {
  const refresh = useAppStore((s) => s.refresh);
  const toast = useAppStore((s) => s.toast);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [masked, setMasked] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [googleMasked, setGoogleMasked] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [googleDraft, setGoogleDraft] = useState("");
  const [models, setModels] = useState<{ id: string; name: string; provider?: "openrouter" | "google" }[]>([]);
  const [draft, setDraft] = useState(settings.models);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [loadingModels, setLoadingModels] = useState(false);

  function applyStatus(data: {
    configured?: boolean;
    masked?: string | null;
    googleConfigured?: boolean;
    googleMasked?: string | null;
  }) {
    setConfigured(Boolean(data.configured));
    setMasked(data.masked ?? null);
    setGoogleConfigured(Boolean(data.googleConfigured));
    setGoogleMasked(data.googleMasked ?? null);
  }

  async function loadCatalog() {
    setError("");
    setLoadingModels(true);
    try {
      const response = await fetch("/api/ai/models?free=1");
      const body = (await response.json()) as {
        models?: { id: string; name: string; provider?: "openrouter" | "google" }[];
        openrouterCount?: number;
        googleCount?: number;
        error?: string;
        warnings?: string[];
      };
      if (!response.ok) throw new Error(body.error ?? "Falha ao listar.");
      const list = body.models ?? [];
      setModels(list);
      if (list[0]) {
        setDraft((current) => ({
          prompt: list.some((m) => m.id === current.prompt) ? current.prompt : list[0].id,
          prd: list.some((m) => m.id === current.prd) ? current.prd : list[0].id,
          chat: list.some((m) => m.id === current.chat) ? current.chat : list[0].id,
        }));
      }
      const orCount = body.openrouterCount ?? list.filter((m) => m.provider !== "google").length;
      const googleCount = body.googleCount ?? list.filter((m) => m.provider === "google").length;
      toast(
        list.length
          ? `${orCount} OpenRouter · ${googleCount} Google AI Studio nos menus Prompt, PRD e Chat.`
          : "Nenhum modelo encontrado nessas chaves.",
      );
      if (body.warnings?.length) setError(body.warnings.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao listar.");
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((data: {
        configured?: boolean;
        masked?: string | null;
        googleConfigured?: boolean;
        googleMasked?: string | null;
      }) => {
        applyStatus(data);
        if (data.configured || data.googleConfigured) void loadCatalog();
      })
      .catch(() => setConfigured(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, []);

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
          const wroteOr = Boolean(keyDraft.trim());
          const wroteGoogle = Boolean(googleDraft.trim());
          if (wroteOr || wroteGoogle) {
            const response = await fetch("/api/ai/key", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                openrouter: wroteOr ? keyDraft.trim() : undefined,
                google: wroteGoogle ? googleDraft.trim() : undefined,
              }),
            });
            const body = (await response.json()) as {
              error?: string;
              configured?: boolean;
              masked?: string;
              googleConfigured?: boolean;
              googleMasked?: string | null;
            };
            if (!response.ok) throw new Error(body.error ?? "Não gravou a chave.");
            applyStatus(body);
            setKeyDraft("");
            setGoogleDraft("");
            void loadCatalog();
          }
          dataRepository().saveAiSettings({
            ...settings,
            openrouter_api_key: "",
            models: draft,
          });
          refresh();
          toast(
            wroteOr || wroteGoogle
              ? "Chaves gravadas em .env.local. Modelos salvos neste navegador."
              : "Modelos salvos neste navegador.",
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Falha ao salvar.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-sm text-mute">
        {configured === null
          ? "Checando o servidor…"
          : `OpenRouter: ${configured ? masked : "sem chave"}. Google AI Studio: ${
              googleConfigured ? googleMasked : "sem chave"
            }. As duas vão para .env.local (gitignore). O servidor equilibra as chamadas entre os dois.`}
      </p>
      <Field label="Chave OpenRouter">
        <Input
          type="password"
          autoComplete="off"
          value={keyDraft}
          placeholder={configured ? "Cole uma nova chave para substituir" : "sk-or-..."}
          onChange={(e) => setKeyDraft(e.target.value)}
        />
      </Field>
      <Field label="Chave Google AI Studio (gratuita)">
        <Input
          type="password"
          autoComplete="off"
          value={googleDraft}
          placeholder={googleConfigured ? "Cole uma nova chave para substituir" : "AIza..."}
          onChange={(e) => setGoogleDraft(e.target.value)}
        />
      </Field>
      <Button type="button" variant="ghost" onClick={() => void loadCatalog()} disabled={loadingModels}>
        {loadingModels ? "Buscando modelos…" : "Buscar modelos"}
      </Button>
      {error ? <p className="text-sm text-marco">{error}</p> : null}
      {(["prompt", "prd", "chat"] as const).map((slot) => {
        const options = optionsForSlot(models, draft[slot]);
        return (
          <Field key={slot} label={slot === "prompt" ? "Modelo · prompt (pesquisa)" : `Modelo · ${slot}`}>
            <Select
              value={options.length === 0 ? "" : draft[slot]}
              onChange={(e) => setDraft({ ...draft, [slot]: e.target.value })}
            >
              {options.length === 0 ? (
                <option value="">
                  {loadingModels ? "Carregando…" : "Clique em buscar modelos"}
                </option>
              ) : (
                options.map((model) => (
                  <option key={`${slot}-${model.provider ?? "or"}-${model.id}`} value={model.id}>
                    {catalogLabel(model)}
                  </option>
                ))
              )}
            </Select>
          </Field>
        );
      })}
      <Button type="submit" disabled={saving}>
        {saving ? "Salvando…" : "Salvar chave e modelos"}
      </Button>
    </form>
  );
}

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { IdeaRouteMap } from "@/components/idea-route-map";
import Link from "next/link";

const steps = [
  {
    title: "Descreva a ideia",
    body: "Nome, intenção e, se quiser, um site de referência. A leitura de URL ainda é simulada nesta fase.",
  },
  {
    title: "Ajuste o mapa",
    body: "Requisitos, telas e versões ficam editáveis. O chat do workspace propõe mudanças sem jogar o briefing fora.",
  },
  {
    title: "Exporte para a IDE",
    body: "Gere o ZIP com PRD, telas e arquivos que Cursor, Claude Code, Codex e Antigravity já entendem.",
  },
];

const destinations = [
  { name: "Cursor", note: "recomendado" },
  { name: "Claude Code", note: "" },
  { name: "Codex", note: "" },
  { name: "Antigravity", note: "" },
  { name: "Markdown", note: "" },
];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="glow-spot -left-32 top-0 h-[28rem] w-[28rem] bg-trail/20" />
      <div className="glow-spot right-[-8rem] top-40 h-[22rem] w-[22rem] bg-emerald/10" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 lg:px-8">
        <Logo href="/" markId="logo-landing" />
        <div className="flex shrink-0 items-center gap-2">
          <Button href="/login" variant="ghost">
            Entrar
          </Button>
          <Button href="/signup">Começar</Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 lg:px-8">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:py-16">
          <div>
            <h1 className="display max-w-xl text-4xl leading-tight lg:text-6xl">
              Sua ideia, pronta para construir.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-mute">
              Um PRD colado no chat da IDE ainda é um chute. O IdeiaMap transforma o briefing num
              workspace com telas, requisitos e versão — e só então gera o pacote para o agente.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/signup" className="w-full sm:w-auto">
                Criar conta
              </Button>
              <Button href="/login" variant="ghost" className="w-full sm:w-auto">
                Já tenho conta
              </Button>
            </div>
          </div>
          <div className="card overflow-hidden border-trail/30 p-0 shadow-[0_0_80px_rgba(99,102,241,0.18)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 text-xs text-mute">
              <span>Mapa do projeto</span>
              <span className="text-emerald">versão pronta</span>
            </div>
            <div className="h-64 bg-[#070A10] lg:h-80">
              <IdeaRouteMap />
            </div>
          </div>
        </section>

        <section className="border-t border-line py-14">
          <h2 className="display text-3xl">Do briefing ao ZIP</h2>
          <ol className="mt-8 grid gap-4 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="card p-5">
                <p className="font-mono text-sm text-trail">{index + 1}</p>
                <h3 className="display mt-2 text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-mute">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-8 border-t border-line py-14 lg:grid-cols-2">
          <div>
            <h2 className="display text-3xl">Não é mais um gerador de PRD para copiar e colar</h2>
            <p className="mt-4 text-sm leading-7 text-mute">
              Ferramentas como Specd, Draftlytic ou um ChatGPT bem promptado entregam um markdown.
              Isso ajuda — até o agente inventar rotas, esquecer o banco e reescrever o escopo.
            </p>
            <p className="mt-3 text-sm leading-7 text-mute">
              Aqui o plano vive: você edita, versiona e exporta de novo. Análise de concorrentes,
              personas e schema de banco entram depois; nesta fase o núcleo é planejar e exportar.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Telas com rota e prévia HTML, não só um parágrafo de “user flow”.",
              "Requisitos com prioridade, salvos em versão — o ZIP segue essa versão.",
              "Destinos de agente (Cursor, Claude Code, Codex) no mesmo pacote.",
            ].map((item) => (
              <li key={item} className="card px-4 py-3 text-sm leading-6">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-line py-14">
          <h2 className="display text-3xl">O pacote chega na ferramenta que você já usa</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {destinations.map((item) => (
              <span
                key={item.name}
                className={`rounded-full border px-4 py-2 text-sm ${
                  item.note ? "border-trail bg-trail/20 text-ink" : "border-line bg-paper text-mute"
                }`}
              >
                {item.name}
                {item.note ? <span className="ml-1 text-[10px] text-emerald">{item.note}</span> : null}
              </span>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-14">
          <h2 className="display text-3xl">Planos nesta fase local</h2>
          <p className="mt-2 text-sm text-mute">Cobrança real ainda não entra. Os limites abaixo são os do mock.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="card p-6">
              <h3 className="display text-2xl">Trilha</h3>
              <p className="mt-2 text-3xl">R$ 0</p>
              <p className="mt-2 text-sm text-mute">3 projetos · 200 créditos</p>
            </article>
            <article className="card border-trail/40 p-6">
              <h3 className="display text-2xl">Ateliê</h3>
              <p className="mt-2 text-3xl">R$ 79</p>
              <p className="mt-2 text-sm text-mute">20 projetos · 2000 créditos</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-mute lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Logo href="/" markId="logo-footer" />
        <p>IdeiaMap — briefing editável, depois a IDE.</p>
        <Link href="/login" className="text-trail underline">
          Entrar
        </Link>
      </footer>
    </div>
  );
}

export type WireframeComponent = {
  name: string;
  actions: string[];
};

export type WireframeInput = {
  name: string;
  route: string;
  description?: string;
  components: WireframeComponent[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function kind(name: string): "form" | "button" | "list" | "nav" | "field" | "box" {
  const n = name.toLowerCase();
  if (/nav|menu|header|topo/.test(n)) return "nav";
  if (/bot[aã]o|button|cta|enviar|assinar|continuar/.test(n)) return "button";
  if (/formul[aá]rio|form|login|cadastro|senha/.test(n)) return "form";
  if (/campo|input|busca|search|email/.test(n)) return "field";
  if (/lista|list|card|tabela|timeline|linha/.test(n)) return "list";
  return "box";
}

function block(comp: WireframeComponent): string {
  const title = escapeHtml(comp.name);
  const actions = comp.actions.map((a) => `<span class="chip">${escapeHtml(a)}</span>`).join("");
  switch (kind(comp.name)) {
    case "nav":
      return `<nav class="nav"><strong>${title}</strong><div class="row">${actions || '<span class="ghost">Item</span><span class="ghost">Item</span>'}</div></nav>`;
    case "form":
      return `<section class="box"><h3>${title}</h3><label>Campo<input placeholder="…" /></label><label>Campo<input placeholder="…" /></label><div class="row"><span class="btn">${escapeHtml(comp.actions[0] || "Enviar")}</span></div></section>`;
    case "field":
      return `<section class="box"><h3>${title}</h3><label>${title}<input placeholder="…" /></label></section>`;
    case "button":
      return `<div class="row"><span class="btn">${title}</span></div><div class="row muted">${actions}</div>`;
    case "list":
      return `<section class="box"><h3>${title}</h3><div class="item">Item 1</div><div class="item">Item 2</div><div class="item">Item 3</div><div class="row">${actions}</div></section>`;
    default:
      return `<section class="box"><h3>${title}</h3><div class="row">${actions || '<span class="ghost">Conteúdo</span>'}</div></section>`;
  }
}

/** AC-1 / AC-3: HTML de wireframe a partir dos componentes, sem stub genérico. */
export function buildWireframeHtml(input: WireframeInput): string {
  const title = escapeHtml(input.name || "Tela");
  const route = escapeHtml(input.route || "/");
  const description = escapeHtml(input.description ?? "");
  const components = input.components.length
    ? input.components
    : [{ name: "Conteúdo", actions: ["Ação principal"] }];
  const blocks = components.map(block).join("\n");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:#dbe3ea; color:#1a2330; }
    .phone { max-width: 420px; margin: 20px auto; background:#f7f9fb; border:1px solid #b7c2cc; min-height: 620px; border-radius: 18px; overflow:hidden; box-shadow: 0 12px 40px rgba(15,23,42,.12); }
    header.app { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px dashed #8ea0b0; background:#eef3f7; }
    header.app small { color:#5b6774; font-family: ui-monospace, monospace; }
    main { padding: 16px; display:grid; gap:12px; }
    h1 { font-size: 22px; margin:0 0 4px; }
    .lead { margin:0 0 8px; color:#5b6774; font-size:13px; }
    .box { border:1px dashed #7d93a6; padding:12px; background:#f3f6f8; border-radius:10px; }
    h3 { margin:0 0 8px; font-size:14px; }
    label { display:grid; gap:4px; font-size:12px; color:#5b6774; margin-bottom:8px; }
    input { border:1px solid #c5d0da; padding:8px; border-radius:8px; background:#fff; }
    .row { display:flex; gap:8px; flex-wrap:wrap; }
    .btn { background:#4f46e5; color:#fff; border:0; padding:8px 12px; border-radius:8px; font-size:13px; }
    .chip, .ghost { border:1px dashed #8ea0b0; padding:4px 8px; border-radius:999px; font-size:11px; color:#3d4a57; background:#fff; }
    .item { border-bottom:1px dashed #c5d0da; padding:8px 0; font-size:13px; }
    .nav { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border:1px dashed #7d93a6; border-radius:10px; }
    .muted { color:#5b6774; font-size:12px; }
  </style>
</head>
<body>
  <div class="phone">
    <header class="app">
      <strong>${title}</strong>
      <small>${route}</small>
    </header>
    <main>
      ${description ? `<p class="lead">${description}</p>` : ""}
      ${blocks}
    </main>
  </div>
</body>
</html>`;
}

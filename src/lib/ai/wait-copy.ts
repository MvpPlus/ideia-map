export const GENERATING_LINES = [
  "Construindo o melhor app da sua vida…",
  "A próxima ideia unicórnio está no forno…",
  "Mapeando telas, requisitos e a rota até a IDE…",
  "A IA está costurando o briefing no mapa…",
  "Quase lá — o planejamento está ganhando forma…",
  "Polindo o PRD até ele caber no bolso da IDE…",
  "Alimentando o unicórnio com café e critérios de aceite…",
  "Desenhando a primeira tela como se fosse a última…",
  "Traduzindo a ideia em rotas que dão para clicar…",
  "Empilhando requisitos sem derrubar o produto…",
  "Aguardando o modelo achar o fio da meada…",
  "Costurando personas, dores e um CTA honesto…",
  "Separando o que é ouro do que é feature de vaidade…",
  "Colocando o briefing no mapa sem perder o tom…",
  "Inventando nomes de tela que sua mãe entenderia…",
  "Medindo se isso vira app ou só um slide bonito…",
  "Apertando os parafusos do fluxo feliz…",
  "Pedindo licença ao caos para organizar as versões…",
  "Soprando sorte no backlog até ele brilhar…",
  "Afilando o problema até sobrar só o essencial…",
  "Montando o tabuleiro para o Cursor jogar depois…",
  "Aquecendo os tokens no ponto certo do briefing…",
  "Dobrado o mapa: agora é só não rasgar no meio…",
  "Procurando o botão Começar escondido na ideia…",
  "Fazendo o unicórnio assinar os critérios de aceite…",
  "Limpando o excesso para o app caber na vida real…",
  "Costurando o export como se já fosse segunda-feira…",
  "Dando nome às telas que ainda não existem…",
  "Penteando o briefing para não sobrar ponta solta…",
  "Levando a ideia da conversa para o wireframe…",
  "Esquentando o forno: o mapa sai crocante daqui a pouco…",
  "Alinhando estrelas, rotas e um pouco de sorte…",
];

export function shuffleLines(items: string[] = GENERATING_LINES, rng: () => number = Math.random): string[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function lineAt(elapsedMs: number, intervalMs = 2800, lines: string[] = GENERATING_LINES): string {
  const index = Math.floor(elapsedMs / intervalMs) % lines.length;
  return lines[index] ?? lines[0] ?? GENERATING_LINES[0];
}

/** AC-2: sobe em direção a 92 e para ali até o fim real. */
export function nextFakeProgress(current: number): number {
  if (current >= 92) return 92;
  return Math.min(92, current + Math.max(0.6, (92 - current) * 0.07));
}

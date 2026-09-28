// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeLlm = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/complete", () => ({ completeLlm }));

import { POST } from "./route";

const PLAN = `# Plano de implementação

## Fases
Fase 1 — MVP.

## Tarefas
### Fase 1
- [ ] Criar tabela responses (M)

## Dependências
Auth antes de respostas.

## Marcos
MVP no ar.`;

function request(body: unknown) {
  return new Request("http://localhost/api/ai/artifact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/artifact (spec 015)", () => {
  beforeEach(() => {
    completeLlm.mockReset();
  });

  it("AC-2: pede Markdown sem forçar o modo JSON do provedor", async () => {
    completeLlm.mockResolvedValue(PLAN);

    const response = await POST(request({ kind: "plan", prd: "# App\n\n## Resumo\nx", artifacts: [] }));

    expect(response.status).toBe(200);
    expect(completeLlm).toHaveBeenCalledWith(expect.objectContaining({ json: false, purpose: "doc-plan" }));
  });
});

import { useState } from "react"

import { PageHeader } from "@/components/guardiao/ui-kit"
import { actions, useStore, FASES, PROMPTS_FASE_PADRAO, type Fase } from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, RotateCcw, Save, FilePlus2 } from "lucide-react"

export default function PromptsMetodologia() {
  const prompts = useStore((s) => s.promptsMetodologia)
  const [faseSel, setFaseSel] = useState<Fase>(1)
  const [draft, setDraft] = useState<string>(prompts[1])
  const [versoes, setVersoes] = useState<Record<Fase, { label: string; texto: string }[]>>({
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [],
  })

  const selecionar = (f: Fase) => { setFaseSel(f); setDraft(prompts[f]) }
  const faseAtual = FASES.find((f) => f.num === faseSel)!

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompts da Metodologia"
        subtitle="Um prompt mestre para cada fase da jornada do Guardião de IA."
      />

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="rounded-lg border bg-card p-2 h-fit">
          {FASES.map((f) => (
            <button
              key={f.num}
              onClick={() => selecionar(f.num)}
              className={"w-full text-left px-3 py-2 rounded-md text-sm transition " +
                (faseSel === f.num
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              <div className="text-[11px] opacity-80">Fase 0{f.num}</div>
              <div className="leading-tight">{f.titulo}</div>
            </button>
          ))}
        </aside>

        <section className="space-y-4">
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-sm font-semibold">Prompt da Fase 0{faseSel} — {faseAtual.titulo}</h3>
                <p className="text-xs text-muted-foreground">Edite, salve, copie ou restaure o padrão.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { void navigator.clipboard.writeText(draft) }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVersoes({
                    ...versoes,
                    [faseSel]: [{ label: `Versão ${new Date().toLocaleString("pt-BR")}`, texto: draft }, ...versoes[faseSel]],
                  })}
                >
                  <FilePlus2 className="h-3.5 w-3.5" /> Salvar versão
                </Button>
                <Button size="sm" onClick={() => actions.setPromptFase(faseSel, draft)}>
                  <Save className="h-3.5 w-3.5" /> Salvar como padrão
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { actions.resetPromptFase(faseSel); setDraft(PROMPTS_FASE_PADRAO[faseSel]) }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                </Button>
              </div>
            </div>
            <Textarea
              className="w-full bg-muted min-h-[400px] font-mono text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>

          {versoes[faseSel].length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h4 className="text-sm font-semibold mb-2">Versões personalizadas desta sessão</h4>
              <div className="space-y-2">
                {versoes[faseSel].map((v, i) => (
                  <div key={i} className="p-3 rounded-md bg-muted text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{v.label}</div>
                      <button onClick={() => setDraft(v.texto)} className="text-xs text-primary">Usar</button>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground mt-2 max-h-24 overflow-hidden">{v.texto.slice(0, 240)}{v.texto.length > 240 ? "..." : ""}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

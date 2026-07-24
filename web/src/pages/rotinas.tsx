// Rotinas e Rituais — a cadência diária/semanal/quinzenal/mensal do Guardião de IA.
// Conteúdo fixo (ROTINAS): cada card mostra checklist + entrega/perguntas, o número de
// tarefas já abertas naquela cadência, e atalhos para criar/ver as tarefas correspondentes.
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusIcon as Plus, CheckSquareIcon as CheckSquare } from "@/components/ui/icons"
import { ROTINAS, listarTarefas } from "@/lib/guardiao/tarefas"

interface Props {
  session?: Session
  clientId?: string
}

export default function RotinasPage({ session, clientId }: Props) {
  const resolvedClientId = clientId || session?.user?.id
  const navigate = useNavigate()
  const [contagem, setContagem] = useState<Record<string, { total: number; abertas: number }>>({})

  useEffect(() => {
    if (!resolvedClientId) return
    let cancelado = false
    listarTarefas(resolvedClientId)
      .then((tarefas) => {
        if (cancelado) return
        const map: Record<string, { total: number; abertas: number }> = {}
        for (const t of tarefas) {
          const m = (map[t.origem] ??= { total: 0, abertas: 0 })
          m.total++
          if (t.status !== "concluido") m.abertas++
        }
        setContagem(map)
      })
      .catch((e) => console.error("Erro ao contar tarefas:", e))
    return () => { cancelado = true }
  }, [resolvedClientId])

  if (!resolvedClientId) return null

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Rotinas e Rituais</h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Acompanhe a cadência diária, semanal, quinzenal e mensal do Guardião de IA.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {ROTINAS.map((r) => {
          const c = contagem[r.origem]?.abertas ?? 0
          return (
            <Card key={r.origem} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Cadência</p>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{r.titulo}</h2>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[13px] font-bold text-primary ring-1 ring-primary/30">
                    {c}
                  </span>
                </div>

                <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">{r.descricao}</p>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Checklist</p>
                  <ul className="space-y-1.5">
                    {r.checklist.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] font-medium text-foreground leading-snug">
                        <CheckSquare className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{r.perguntasTitulo}</p>
                  <ul className="space-y-1">
                    {r.perguntas.map((p) => (
                      <li key={p} className="text-[12px] font-medium text-muted-foreground leading-snug">· {p}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto space-y-2 pt-2">
                  <Button
                    className="w-full gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
                    onClick={() => navigate(`/tarefas?nova=1&origem=${r.origem}`)}
                  >
                    <Plus className="size-4" />
                    Criar atividade {tituloCurto(r.titulo)}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                    onClick={() => navigate(`/tarefas?origem=${r.origem}`)}
                  >
                    Ver atividades
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// "Rotina Diária" -> "diária"
function tituloCurto(titulo: string): string {
  return titulo.replace(/^Rotina\s+/i, "").toLowerCase()
}

import { useState } from "react"

import { PageHeader } from "@/components/guardiao/ui-kit"
import { actions, useStore, PROMPT_PADRAO } from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, RotateCcw, Save, Pencil } from "lucide-react"

export default function PromptCompleto() {
  const prompt = useStore((s) => s.promptCompleto)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(prompt)
  const [copied, setCopied] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(editing ? draft : prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const salvar = () => {
    actions.setPrompt(draft)
    setEditing(false)
  }
  const restaurar = () => {
    if (confirm("Restaurar o prompt original? Sua versão personalizada será perdida.")) {
      actions.resetPrompt()
      setDraft(PROMPT_PADRAO)
      setEditing(false)
    }
  }
  const entrarEdicao = () => {
    setDraft(prompt)
    setEditing(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acesse o prompt completo"
        subtitle="Use este prompt para adaptar o sistema à sua rotina, ao seu setor ou à realidade da sua empresa."
      />

      <div className="rounded-lg border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Você pode adaptar este prompt com base no setor, nos gargalos identificados, na rotina da empresa e nos
          projetos pilotos que deseja criar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copiar}>
          <Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copiar prompt completo"}
        </Button>
        {!editing ? (
          <Button variant="outline" onClick={entrarEdicao}>
            <Pencil className="h-4 w-4" /> Editar prompt
          </Button>
        ) : (
          <Button onClick={salvar}>
            <Save className="h-4 w-4" /> Salvar versão personalizada
          </Button>
        )}
        <Button variant="outline" onClick={restaurar}>
          <RotateCcw className="h-4 w-4" /> Restaurar prompt original
        </Button>
      </div>

      <Textarea
        readOnly={!editing}
        value={editing ? draft : prompt}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-[600px] font-mono whitespace-pre-wrap"
      />
    </div>
  )
}

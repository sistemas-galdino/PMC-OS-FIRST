import { useState } from "react"
import { BookOpen, ExternalLink, Settings, Save, Check, Link2 } from "lucide-react"
import { toast } from "sonner"
import { isAdmin, setManual, useManual, useProfile } from "@/lib/crm/storage"
import { formatBR } from "@/lib/crm/format"
import type { ManualCS, ProfileName } from "@/lib/crm/types"

const DEFAULT_MANUAL_URL = "https://manualdocs.multiplicadordecrescimento.com.br/"

export default function CrmManualPage() {
  const manual = useManual()
  const [profile] = useProfile()
  // No original a coordenação era uma lista fixa de nomes ("Maiara"/"Galdino").
  // Aqui quem pode configurar vem do RBAC do PMC OS.
  const podeConfigurar = isAdmin(profile)
  const [showConfig, setShowConfig] = useState(false)

  const url = manual.link?.trim() || DEFAULT_MANUAL_URL

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Manual de CS</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manual operacional da equipe de Sucesso do Cliente do PMC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg px-3 py-2 hover:bg-primary/90"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba
          </a>
          {podeConfigurar && (
            <button
              onClick={() => setShowConfig((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs border border-border hover:border-primary rounded-lg px-3 py-2"
            >
              <Settings className="h-3.5 w-3.5" /> {showConfig ? "Fechar" : "Configurar link"}
            </button>
          )}
        </div>
      </div>

      {podeConfigurar && showConfig && <ManualConfig manual={manual} />}

      {/* Iframe do manual */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span className="truncate">{url}</span>
          <span>
            Se o manual não carregar aqui, use o botão{" "}
            <span className="text-foreground font-semibold">Abrir em nova aba</span>.
          </span>
        </div>
        <iframe
          src={url}
          title="Manual de CS"
          className="w-full bg-white"
          style={{ height: "calc(100vh - 220px)", minHeight: 600 }}
        />
      </div>
    </div>
  )
}

// ============ Config (link externo opcional) ============
function ManualConfig({ manual }: { manual: ManualCS }) {
  const [profile] = useProfile()
  // O spread preserva as colunas que o tipo ManualCS não declara (id, ordem) —
  // é o que faz o upsert do store atualizar o registro existente em vez de
  // criar um novo a cada salvamento.
  const [draft, setDraft] = useState<ManualCS>({
    ...manual,
    link: manual.link || DEFAULT_MANUAL_URL,
  })
  const [saved, setSaved] = useState(false)

  async function save() {
    const next: ManualCS = {
      ...draft,
      atualizado_em: new Date().toISOString(),
      responsavel: (profile as ProfileName) || draft.responsavel,
    }
    try {
      await setManual(next)
      setDraft(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      toast.error(`Não foi possível salvar o link do manual: ${(e as Error).message}`)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Link do manual</div>
      </div>
      <p className="text-xs text-muted-foreground">
        O manual é exibido diretamente do endereço abaixo. Padrão:{" "}
        <span className="font-mono">{DEFAULT_MANUAL_URL}</span>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs">
          <div className="text-muted-foreground mb-1 font-semibold">Nome</div>
          <input
            value={draft.nome}
            onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>
        <label className="text-xs">
          <div className="text-muted-foreground mb-1 font-semibold">URL</div>
          <input
            value={draft.link}
            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
            placeholder="https://..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        {saved && (
          <span className="text-status-green inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> Salvo · {formatBR(new Date().toISOString())}
          </span>
        )}
        <button
          onClick={() => void save()}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-3 py-2 rounded-lg hover:bg-primary/90"
        >
          <Save className="h-3.5 w-3.5" /> Salvar
        </button>
      </div>
    </div>
  )
}

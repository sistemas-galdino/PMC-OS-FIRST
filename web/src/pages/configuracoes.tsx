import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Edit3Icon as Edit3,
  CheckCircle2Icon as CheckCircle2,
  ExternalLinkIcon as ExternalLink,
} from "@/components/ui/icons"
import { motion } from "framer-motion"

interface LinkConfig {
  id: number
  chave: string
  label: string
  descricao: string | null
  url: string
  ativo: boolean
}

export default function ConfiguracoesPage() {
  const [links, setLinks] = useState<LinkConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState("")
  const [editLabel, setEditLabel] = useState("")
  const [editDescricao, setEditDescricao] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchLinks() {
      const { data } = await supabase
        .from('configuracoes_links')
        .select('*')
        .order('id')
      if (data) setLinks(data)
      setLoading(false)
    }
    fetchLinks()
  }, [])

  function startEdit(link: LinkConfig) {
    setEditingId(link.id)
    setEditUrl(link.url)
    setEditLabel(link.label)
    setEditDescricao(link.descricao || "")
  }

  async function handleSave(id: number) {
    setSaving(true)
    const { error } = await supabase
      .from('configuracoes_links')
      .update({ url: editUrl, label: editLabel, descricao: editDescricao, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setLinks(prev => prev.map(l =>
        l.id === id ? { ...l, url: editUrl, label: editLabel, descricao: editDescricao } : l
      ))
      setEditingId(null)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/4 bg-card/40 rounded-xl" />
        <div className="h-[400px] w-full bg-card/40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground font-medium text-sm">Links de acesso rápido do painel do cliente.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="space-y-4"
      >
        {links.map((link) => (
          <Card key={link.id} className="border-border bg-card/50 backdrop-blur-md">
            <CardContent className="p-6">
              {editingId === link.id ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 border-primary/20 text-primary">
                      {link.chave}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Label</Label>
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-11 rounded-xl border-border bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                      <Input
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        className="h-11 rounded-xl border-border bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL</Label>
                      <Input
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-11 rounded-xl border-border bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-xs font-bold uppercase tracking-wider">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => handleSave(link.id)} disabled={saving} className="text-xs font-bold uppercase tracking-wider gap-2">
                      <CheckCircle2 className="size-4" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 border-primary/20 text-primary shrink-0">
                      {link.chave}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{link.label}</p>
                      <p className="text-[11px] text-muted-foreground">{link.descricao}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {link.url ? (
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex items-center gap-1.5">
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">{link.url}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sem URL configurada</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(link)} className="shrink-0 ml-4">
                    <Edit3 className="size-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </div>
  )
}

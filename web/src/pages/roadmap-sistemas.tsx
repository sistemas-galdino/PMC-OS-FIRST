import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import {
  LayoutDashboardIcon,
  PackageIcon,
  MapIcon,
} from "@/components/ui/icons"
import { RoadmapSectionHeader } from "@/components/roadmap/roadmap-section-header"
import { DashboardExecutivo } from "@/components/roadmap/dashboard-executivo"
import { EscopoPriorizacao } from "@/components/roadmap/escopo-priorizacao"
import { RoadmapVisual } from "@/components/roadmap/roadmap-visual"
import { EditarItemDialog } from "@/components/roadmap/editar-item-dialog"
import type { RoadmapProjeto, RoadmapItem, Fase } from "@/lib/roadmap"

type Toast = { type: "ok" | "err"; msg: string } | null

export default function RoadmapSistemasPage() {
  const [projeto, setProjeto] = useState<RoadmapProjeto | null>(null)
  const [itens, setItens] = useState<RoadmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    async function load() {
      const [{ data: proj }, { data: items }] = await Promise.all([
        supabase.from("roadmap_projeto").select("*").limit(1).maybeSingle(),
        supabase.from("roadmap_itens").select("*").order("ordem", { ascending: true }),
      ])
      setProjeto((proj as RoadmapProjeto) ?? null)
      setItens((items as RoadmapItem[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateProjeto(patch: Partial<RoadmapProjeto>) {
    if (!projeto) return
    const prev = projeto
    setProjeto({ ...projeto, ...patch })
    const { data, error } = await supabase
      .from("roadmap_projeto")
      .update(patch)
      .eq("id", projeto.id)
      .select()
      .single()
    if (error) {
      setProjeto(prev)
      setToast({ type: "err", msg: "Erro ao salvar projeto" })
    } else {
      setProjeto(data as RoadmapProjeto)
      setToast({ type: "ok", msg: "Projeto atualizado" })
    }
  }

  async function updateItem(id: string, patch: Partial<RoadmapItem>) {
    const prev = itens
    setItens(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)))
    const { error } = await supabase.from("roadmap_itens").update(patch).eq("id", id)
    if (error) {
      setItens(prev)
      setToast({ type: "err", msg: "Erro ao atualizar item" })
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Excluir este item do roadmap?")) return
    const prev = itens
    setItens(list => list.filter(i => i.id !== id))
    const { error } = await supabase.from("roadmap_itens").delete().eq("id", id)
    if (error) {
      setItens(prev)
      setToast({ type: "err", msg: "Erro ao excluir item" })
    } else {
      setToast({ type: "ok", msg: "Item excluído" })
    }
  }

  async function moveItem(id: string, fase: Fase) {
    const maxOrdem = itens
      .filter(i => i.fase === fase)
      .reduce((m, i) => Math.max(m, i.ordem), -1)
    await updateItem(id, { fase, ordem: maxOrdem + 1 })
  }

  async function saveItem(id: string | null, payload: Partial<RoadmapItem>) {
    if (id) {
      const prev = itens
      setItens(list => list.map(i => (i.id === id ? { ...i, ...payload } : i)))
      const { error } = await supabase.from("roadmap_itens").update(payload).eq("id", id)
      if (error) {
        setItens(prev)
        setToast({ type: "err", msg: "Erro ao salvar item" })
      } else {
        setToast({ type: "ok", msg: "Item salvo" })
      }
    } else {
      const fase = (payload.fase as Fase) ?? "ideacao"
      const maxOrdem = itens
        .filter(i => i.fase === fase)
        .reduce((m, i) => Math.max(m, i.ordem), -1)
      const { data, error } = await supabase
        .from("roadmap_itens")
        .insert({ ...payload, ordem: maxOrdem + 1 })
        .select()
        .single()
      if (error || !data) {
        setToast({ type: "err", msg: "Erro ao criar item" })
      } else {
        setItens(list => [...list, data as RoadmapItem])
        setToast({ type: "ok", msg: "Item criado" })
      }
    }
  }

  function openNew() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function openEdit(item: RoadmapItem) {
    setEditTarget(item)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 w-full rounded-2xl bg-card/40" />
        <div className="h-12 w-1/3 rounded-xl bg-card/40" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-xl bg-card/40" />
          <div className="h-40 rounded-xl bg-card/40" />
        </div>
        <div className="h-72 w-full rounded-2xl bg-card/40" />
      </div>
    )
  }

  if (!projeto) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive">
        Não foi possível carregar o roadmap. Recarregue a página.
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-10">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-6 right-6 z-50 rounded-xl border px-5 py-3 text-sm font-semibold shadow-2xl ${
            toast.type === "ok"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.msg}
        </motion.div>
      )}

      <section className="space-y-5">
        <RoadmapSectionHeader
          icon={<LayoutDashboardIcon className="size-5" />}
          title="Dashboard Executivo"
          subtitle="Visão geral do projeto"
        />
        <DashboardExecutivo
          projeto={projeto}
          itens={itens}
          onUpdateProjeto={updateProjeto}
        />
      </section>

      <section className="space-y-5">
        <RoadmapSectionHeader
          icon={<PackageIcon className="size-5" />}
          title="Escopo do Projeto"
          subtitle="Detalhamento de funcionalidades"
        />
        <EscopoPriorizacao
          itens={itens}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          onEditItem={openEdit}
          onAddItem={openNew}
        />
      </section>

      <section className="space-y-5">
        <RoadmapSectionHeader
          icon={<MapIcon className="size-5" />}
          title="Roadmap Visual"
          subtitle="Acompanhamento por fases"
        />
        <RoadmapVisual itens={itens} onMoveItem={moveItem} onEditItem={openEdit} />
      </section>

      <EditarItemDialog
        open={dialogOpen}
        item={editTarget}
        onClose={() => setDialogOpen(false)}
        onSave={saveItem}
      />
    </div>
  )
}

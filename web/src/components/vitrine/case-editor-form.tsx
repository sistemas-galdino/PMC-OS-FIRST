// Editor dos blocos editoriais de um case da Vitrine.
//
// Vive aqui, e não dentro da página de Cases, porque hoje duas telas editam o
// mesmo material: a mesa de curadoria (/vitrine-cases) e o card aprovado do
// Repositório de Vitórias, que abre o case já no dialog de detalhe da vitória.
//
// As duas regras editoriais herdadas continuam valendo e estão espalhadas nos
// rótulos: "Área impactada" (categoria) NUNCA é o nicho do cliente, e todo
// texto do banco passa por exibivel() para PENDENTE_VALIDACAO não vazar.
//
// O botão "Gerar com IA" chama a edge function em modo rascunho (persistir
// false): preenche o formulário e só grava quando alguém clicar em Salvar.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CaseCard } from "@/components/vitrine/case-card"
import {
  Sparkles2Icon as Sparkles,
  RefreshCwIcon as RefreshCw,
} from "@/components/ui/icons"
import { gerarCaseIA } from "@/lib/vitrine-ia"
import { exibivel, type ShowcaseCase, type VitrineCase, type VitrineCliente } from "@/lib/vitrine"

export type CaseComCliente = VitrineCase & { cliente?: VitrineCliente | null }

/** Lista de texto no banco, uma por linha no textarea. */
export const paraLinhas = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean)

export type CaseForm = {
  headline_vitrine: string
  categoria: string
  ferramenta_card: string
  foco_ia: boolean
  destaque: boolean
  ordem_vitrine: string
  resumo_executivo: string
  como_era_antes: string
  como_ficou_depois: string
  o_que_pmc_transformou: string
  solucao_criada: string
  principais_gargalos: string
  principais_ganhos: string
}

export function formDe(l: CaseComCliente): CaseForm {
  return {
    headline_vitrine: exibivel(l.headline_vitrine) ?? "",
    categoria: exibivel(l.categoria) ?? "",
    ferramenta_card: exibivel(l.ferramenta_card) ?? "",
    foco_ia: l.foco_ia,
    destaque: l.destaque,
    ordem_vitrine: l.ordem_vitrine == null ? "" : String(l.ordem_vitrine),
    resumo_executivo: exibivel(l.resumo_executivo) ?? "",
    como_era_antes: exibivel(l.como_era_antes) ?? "",
    como_ficou_depois: exibivel(l.como_ficou_depois) ?? "",
    o_que_pmc_transformou: exibivel(l.o_que_pmc_transformou) ?? "",
    solucao_criada: exibivel(l.solucao_criada) ?? "",
    principais_gargalos: (l.principais_gargalos ?? []).join("\n"),
    principais_ganhos: (l.principais_ganhos ?? []).join("\n"),
  }
}

/** Monta o objeto que o CaseCard consome, pra ver a headline como ela vai sair. */
function paraShowcase(l: CaseComCliente, f: CaseForm): ShowcaseCase {
  return {
    case_id: l.case_id,
    vitrine_case_id: l.id,
    vitrine_cliente_id: l.vitrine_cliente_id,
    id_cliente: l.id_cliente,
    codigo_cliente: l.codigo_cliente,
    empresa_nome: l.empresa_nome ?? l.cliente?.empresa_nome ?? "Empresa",
    cliente_nome: l.cliente?.cliente_nome ?? null,
    nicho: l.cliente?.nicho ?? null,
    subnicho: l.cliente?.subnicho ?? null,
    cs_responsavel: l.cliente?.cs_responsavel ?? null,
    logo_path: l.cliente?.logo_path ?? null,
    logo_display_path: l.cliente?.logo_display_path ?? null,
    categoria: f.categoria || null,
    foco_ia: f.foco_ia,
    ferramenta_card: f.ferramenta_card || null,
    headline_impacto: l.headline_impacto,
    headline_vitrine: f.headline_vitrine || null,
    resumo_executivo: f.resumo_executivo || null,
    como_era_antes: f.como_era_antes || null,
    principais_gargalos: paraLinhas(f.principais_gargalos),
    como_ficou_depois: f.como_ficou_depois || null,
    o_que_pmc_transformou: f.o_que_pmc_transformou || null,
    principais_ganhos: paraLinhas(f.principais_ganhos),
    solucao_criada: f.solucao_criada || null,
    processo_atual: l.processo_atual,
    resultado_principal: l.resultado_principal,
    capa_url: l.capa_url,
    palavras_chave: l.palavras_chave ?? [],
    destaque: f.destaque,
    ordem_vitrine: l.ordem_vitrine,
  }
}

function temConteudo(f: CaseForm): boolean {
  return Boolean(
    f.resumo_executivo || f.como_era_antes || f.como_ficou_depois ||
      f.o_que_pmc_transformou || f.solucao_criada || f.principais_gargalos || f.principais_ganhos,
  )
}

interface Props {
  caso: CaseComCliente
  /** Devolve o case já com o patch aplicado, para a tela dona atualizar a lista. */
  onSalvo?: (caso: CaseComCliente) => void
  onCancelar?: () => void
  /** Mostra o preview do card ao lado (a mesa de curadoria usa; o kanban não). */
  comPreview?: boolean
}

export function CaseEditorForm({ caso, onSalvo, onCancelar, comPreview = true }: Props) {
  const [form, setForm] = useState<CaseForm>(() => formDe(caso))
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)

  // Trocar de case (kanban abre um card por vez) precisa recarregar o formulário.
  useEffect(() => setForm(formDe(caso)), [caso.id])

  const preview = useMemo(() => paraShowcase(caso, form), [caso, form])

  async function gerar() {
    if (temConteudo(form) && !confirm("Isso substitui o texto atual do formulário. Continuar?")) return
    setGerando(true)
    try {
      const ia = await gerarCaseIA(caso.id, { persistir: false })
      setForm((f) => ({
        ...f,
        headline_vitrine: ia.headline_vitrine || f.headline_vitrine,
        categoria: ia.categoria || f.categoria,
        foco_ia: ia.foco_ia,
        resumo_executivo: ia.resumo_executivo,
        como_era_antes: ia.como_era_antes,
        como_ficou_depois: ia.como_ficou_depois,
        o_que_pmc_transformou: ia.o_que_pmc_transformou,
        solucao_criada: ia.solucao_criada,
        principais_gargalos: ia.principais_gargalos.join("\n"),
        principais_ganhos: ia.principais_ganhos.join("\n"),
      }))
      toast.success("Rascunho gerado. Revise antes de salvar.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o texto.")
    } finally {
      setGerando(false)
    }
  }

  async function salvar() {
    const ordem = form.ordem_vitrine.trim() === "" ? null : Number(form.ordem_vitrine)
    if (ordem != null && Number.isNaN(ordem)) {
      toast.error("A ordem na vitrine precisa ser um número.")
      return
    }
    setSalvando(true)
    const patch = {
      headline_vitrine: form.headline_vitrine.trim() || null,
      categoria: form.categoria.trim() || null,
      ferramenta_card: form.ferramenta_card.trim() || null,
      foco_ia: form.foco_ia,
      destaque: form.destaque,
      ordem_vitrine: ordem,
      resumo_executivo: form.resumo_executivo.trim() || null,
      como_era_antes: form.como_era_antes.trim() || null,
      como_ficou_depois: form.como_ficou_depois.trim() || null,
      o_que_pmc_transformou: form.o_que_pmc_transformou.trim() || null,
      solucao_criada: form.solucao_criada.trim() || null,
      principais_gargalos: paraLinhas(form.principais_gargalos),
      principais_ganhos: paraLinhas(form.principais_ganhos),
    }
    const { error } = await supabase.from("vitrine_cases").update(patch).eq("id", caso.id)
    setSalvando(false)
    if (error) {
      toast.error("Não foi possível salvar o case.")
      return
    }
    toast.success("Case atualizado.")
    onSalvo?.({ ...caso, ...patch })
  }

  return (
    <div className={comPreview ? "grid gap-6 lg:grid-cols-[1fr_20rem]" : "space-y-5"}>
      <div className="space-y-5">
        {caso.gerado_por_ia && (
          <Badge variant="outline" className="gap-1.5 text-[10px] uppercase tracking-wider">
            <Sparkles className="size-3" />
            Texto gerado por IA
          </Badge>
        )}

        <div className="space-y-2">
          <Label htmlFor="headline">Headline da vitrine</Label>
          <Textarea
            id="headline"
            rows={3}
            value={form.headline_vitrine}
            onChange={(e) => setForm({ ...form, headline_vitrine: e.target.value })}
            placeholder="A transformação em uma frase — é o que aparece no card."
          />
          {exibivel(caso.headline_impacto) && (
            <p className="text-[11px] text-muted-foreground">
              Headline de impacto original: {exibivel(caso.headline_impacto)}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="categoria">Área impactada</Label>
            <Input
              id="categoria"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              placeholder="Ex.: Vendas, Financeiro, Operações"
            />
            <p className="text-[11px] text-muted-foreground">
              A área do negócio transformada — não é o nicho do cliente.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ferramenta">Ferramenta do card</Label>
            <Input
              id="ferramenta"
              value={form.ferramenta_card}
              onChange={(e) => setForm({ ...form, ferramenta_card: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Checkbox
              checked={form.foco_ia}
              onCheckedChange={(v) => setForm({ ...form, foco_ia: v === true })}
            />
            Case com foco em IA
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Checkbox
              checked={form.destaque}
              onCheckedChange={(v) => setForm({ ...form, destaque: v === true })}
            />
            Destaque
          </label>
          <div className="flex items-center gap-2">
            <Label htmlFor="ordem" className="text-xs">
              Ordem na vitrine
            </Label>
            <Input
              id="ordem"
              inputMode="numeric"
              className="h-9 w-24"
              value={form.ordem_vitrine}
              onChange={(e) => setForm({ ...form, ordem_vitrine: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="resumo">Resumo executivo</Label>
          <Textarea id="resumo" rows={3} value={form.resumo_executivo} onChange={(e) => setForm({ ...form, resumo_executivo: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="antes">Como era antes</Label>
            <Textarea id="antes" rows={4} value={form.como_era_antes} onChange={(e) => setForm({ ...form, como_era_antes: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depois">Como ficou depois</Label>
            <Textarea id="depois" rows={4} value={form.como_ficou_depois} onChange={(e) => setForm({ ...form, como_ficou_depois: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gargalos">Principais gargalos (um por linha)</Label>
            <Textarea id="gargalos" rows={4} value={form.principais_gargalos} onChange={(e) => setForm({ ...form, principais_gargalos: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ganhos">Principais ganhos (um por linha)</Label>
            <Textarea id="ganhos" rows={4} value={form.principais_ganhos} onChange={(e) => setForm({ ...form, principais_ganhos: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transformou">O que o PMC transformou</Label>
          <Textarea id="transformou" rows={3} value={form.o_que_pmc_transformou} onChange={(e) => setForm({ ...form, o_que_pmc_transformou: e.target.value })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="solucao">Solução criada</Label>
          <Textarea id="solucao" rows={3} value={form.solucao_criada} onChange={(e) => setForm({ ...form, solucao_criada: e.target.value })} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={gerar} disabled={gerando || salvando} className="mr-auto gap-2">
            {gerando ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {gerando ? "Gerando..." : caso.gerado_por_ia ? "Regerar com IA" : "Gerar com IA"}
          </Button>
          {onCancelar && (
            <Button variant="ghost" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </Button>
          )}
          <Button onClick={salvar} disabled={salvando || gerando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {comPreview && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Preview do card
          </p>
          <CaseCard c={preview} className="pointer-events-none" />
        </div>
      )}
    </div>
  )
}

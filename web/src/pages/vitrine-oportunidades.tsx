// Oportunidades da Vitrine — POSSÍVEIS VITÓRIAS FUTURAS.
//
// São projetos que o cliente está tocando e que ainda NÃO viraram case: o
// resultado não foi validado, então nada aqui pode ser tratado como prova.
// Quando a próxima validação confirmar o ganho, a oportunidade vira case.
//
// Regras que NÃO podem ser afrouxadas:
//  1. PENDENTE_VALIDACAO nunca aparece na tela nem em filtro (exibivel/opcoesFiltro).
//  2. Empresa sempre em caixa alta (nomeEmpresa); nome de pessoa preserva a
//     capitalização original.
import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { LogoCliente } from "@/components/vitrine/logo-cliente"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  SearchIcon as Search,
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Edit3Icon as Edit3,
  PlayCircleIcon as PlayCircle,
  LightbulbIcon as Lightbulb,
  CalendarIcon as Calendar,
  TargetIcon as Target,
  SproutIcon as Sprout,
} from "@/components/ui/icons"
import {
  exibivel,
  nomeEmpresa,
  normalizar,
  opcoesFiltro,
  type VitrineOportunidade,
} from "@/lib/vitrine"

/** Radix não aceita SelectItem com value vazio — sentinela para "todos"/"nenhum". */
const TODOS = "__todos__"
const SEM_CLIENTE = "__sem_cliente__"

type ClienteOpt = {
  id: string
  id_cliente: string | null
  empresa_nome: string
  logo_path: string | null
  logo_display_path: string | null
  cs_responsavel: string | null
}

type Form = {
  vitrine_cliente_id: string
  descricao_projeto: string
  status_atual: string
  resultado_esperado: string
  reuniao_nome: string
  reuniao_data: string
  gravacao_url: string
  proxima_validacao: string
  cs_responsavel: string
  observacoes: string
}

const FORM_VAZIO: Form = {
  vitrine_cliente_id: SEM_CLIENTE,
  descricao_projeto: "",
  status_atual: "",
  resultado_esperado: "",
  reuniao_nome: "",
  reuniao_data: "",
  gravacao_url: "",
  proxima_validacao: "",
  cs_responsavel: "",
  observacoes: "",
}

function formatarData(iso: string | null): string | null {
  const v = exibivel(iso)
  if (!v) return null
  const [ano, mes, dia] = v.slice(0, 10).split("-")
  if (!ano || !mes || !dia) return v
  return `${dia}/${mes}/${ano}`
}

export default function VitrineOportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<VitrineOportunidade[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [cs, setCs] = useState(TODOS)
  const [status, setStatus] = useState(TODOS)

  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<VitrineOportunidade | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const [ops, cls] = await Promise.all([
      supabase.from("vitrine_oportunidades").select("*"),
      supabase
        .from("vitrine_clientes")
        .select("id, id_cliente, empresa_nome, logo_path, logo_display_path, cs_responsavel")
        .order("empresa_nome"),
    ])

    if (ops.error || cls.error) {
      toast.error("Não foi possível carregar as oportunidades.")
      setOportunidades([])
      setLoading(false)
      return
    }

    const lista = ((ops.data ?? []) as VitrineOportunidade[]).sort((a, b) =>
      (a.empresa_nome ?? "").localeCompare(b.empresa_nome ?? "", "pt-BR")
    )
    setOportunidades(lista)
    setClientes((cls.data ?? []) as ClienteOpt[])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const porCliente = useMemo(() => {
    const m = new Map<string, ClienteOpt>()
    for (const c of clientes) m.set(c.id, c)
    return m
  }, [clientes])

  const opcoesCs = useMemo(() => opcoesFiltro(oportunidades.map((o) => o.cs_responsavel)), [oportunidades])
  const opcoesStatus = useMemo(() => opcoesFiltro(oportunidades.map((o) => o.status_atual)), [oportunidades])

  const filtradas = useMemo(() => {
    const q = normalizar(busca)
    return oportunidades.filter((o) => {
      if (cs !== TODOS && exibivel(o.cs_responsavel) !== cs) return false
      if (status !== TODOS && exibivel(o.status_atual) !== status) return false
      if (!q) return true
      return normalizar(
        [
          o.empresa_nome ?? "",
          exibivel(o.descricao_projeto) ?? "",
          exibivel(o.resultado_esperado) ?? "",
          exibivel(o.reuniao_nome) ?? "",
        ].join(" ")
      ).includes(q)
    })
  }, [oportunidades, busca, cs, status])

  function abrirNova() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setErro(null)
    setAberto(true)
  }

  function abrirEdicao(o: VitrineOportunidade) {
    setEditando(o)
    setForm({
      vitrine_cliente_id: o.vitrine_cliente_id ?? SEM_CLIENTE,
      descricao_projeto: o.descricao_projeto ?? "",
      status_atual: o.status_atual ?? "",
      resultado_esperado: o.resultado_esperado ?? "",
      reuniao_nome: o.reuniao_nome ?? "",
      reuniao_data: o.reuniao_data ? o.reuniao_data.slice(0, 10) : "",
      gravacao_url: o.gravacao_url ?? "",
      proxima_validacao: o.proxima_validacao ?? "",
      cs_responsavel: o.cs_responsavel ?? "",
      observacoes: o.observacoes ?? "",
    })
    setErro(null)
    setAberto(true)
  }

  function escolherCliente(id: string) {
    const cliente = id === SEM_CLIENTE ? null : porCliente.get(id) ?? null
    setForm((p) => ({
      ...p,
      vitrine_cliente_id: id,
      // O CS do cliente é só um bom padrão — segue editável.
      cs_responsavel: p.cs_responsavel || (exibivel(cliente?.cs_responsavel) ?? ""),
    }))
  }

  async function salvar() {
    if (!form.descricao_projeto.trim()) {
      setErro("Descreva o projeto — é o que diferencia uma oportunidade de outra.")
      return
    }
    const link = form.gravacao_url.trim()
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setErro("O link da gravação precisa começar com http:// ou https://.")
      return
    }

    const cliente =
      form.vitrine_cliente_id === SEM_CLIENTE ? null : porCliente.get(form.vitrine_cliente_id) ?? null

    const patch = {
      vitrine_cliente_id: cliente?.id ?? null,
      id_cliente: cliente?.id_cliente ?? null,
      empresa_nome: cliente?.empresa_nome ?? null,
      descricao_projeto: form.descricao_projeto.trim(),
      status_atual: form.status_atual.trim() || null,
      resultado_esperado: form.resultado_esperado.trim() || null,
      reuniao_nome: form.reuniao_nome.trim() || null,
      reuniao_data: form.reuniao_data || null,
      gravacao_url: link || null,
      proxima_validacao: form.proxima_validacao.trim() || null,
      cs_responsavel: form.cs_responsavel.trim() || null,
      observacoes: form.observacoes.trim() || null,
    }

    setSalvando(true)
    setErro(null)
    const { error } = editando
      ? await supabase.from("vitrine_oportunidades").update(patch).eq("id", editando.id)
      : await supabase.from("vitrine_oportunidades").insert(patch)
    setSalvando(false)

    if (error) {
      toast.error(editando ? "Não foi possível salvar a alteração." : "Não foi possível criar a oportunidade.")
      return
    }
    toast.success(editando ? "Oportunidade atualizada." : "Oportunidade criada.")
    setAberto(false)
    carregar()
  }

  async function excluir(o: VitrineOportunidade) {
    const { error } = await supabase.from("vitrine_oportunidades").delete().eq("id", o.id)
    if (error) {
      toast.error("Não foi possível excluir a oportunidade.")
      return
    }
    setOportunidades((prev) => prev.filter((x) => x.id !== o.id))
    toast.success("Oportunidade excluída.")
  }

  const botaoNova = (
    <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10" onClick={abrirNova}>
      <Plus className="size-5" />
      <span className="text-[11px] font-bold uppercase tracking-wider">Nova oportunidade</span>
    </Button>
  )

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Oportunidades"
        description="Possíveis vitórias futuras: projetos que os clientes já estão tocando, mas cujo resultado ainda NÃO foi validado. Não são cases nem material de venda — são o funil do que pode virar case na próxima validação."
        action={botaoNova}
      />

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl bg-muted/10 pl-10"
            placeholder="Buscar por empresa, projeto ou resultado esperado..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={cs} onValueChange={setCs}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-52">
              <SelectValue placeholder="Filtrar por CS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os CS</SelectItem>
              {opcoesCs.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-52">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os status</SelectItem>
              {opcoesStatus.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : oportunidades.length === 0 ? (
        <VazioTotal onCriar={abrirNova} />
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-12 text-center">
          <Search className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-bold text-foreground">Nenhuma oportunidade com esses filtros</p>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            Ajuste a busca, o CS ou o status para ver o restante do funil.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtradas.map((o) => (
            <CardOportunidade
              key={o.id}
              o={o}
              cliente={o.vitrine_cliente_id ? porCliente.get(o.vitrine_cliente_id) ?? null : null}
              onEditar={() => abrirEdicao(o)}
              onExcluir={() => excluir(o)}
            />
          ))}
        </div>
      )}

      {/* Formulário */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</Label>
              <Select value={form.vitrine_cliente_id} onValueChange={escolherCliente}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="De qual cliente é o projeto?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_CLIENTE}>Sem cliente vinculado</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {nomeEmpresa(c.empresa_nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descrição do projeto *
              </Label>
              <Textarea
                className="min-h-20 rounded-xl"
                placeholder="O que o cliente está construindo?"
                value={form.descricao_projeto}
                onChange={(e) => setForm((p) => ({ ...p, descricao_projeto: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status atual
                </Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Ex.: Em implantação"
                  value={form.status_atual}
                  onChange={(e) => setForm((p) => ({ ...p, status_atual: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  CS responsável
                </Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Quem acompanha"
                  value={form.cs_responsavel}
                  onChange={(e) => setForm((p) => ({ ...p, cs_responsavel: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resultado esperado
              </Label>
              <Textarea
                className="min-h-16 rounded-xl"
                placeholder="Qual ganho esse projeto deve gerar?"
                value={form.resultado_esperado}
                onChange={(e) => setForm((p) => ({ ...p, resultado_esperado: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reunião</Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Em que reunião apareceu"
                  value={form.reuniao_nome}
                  onChange={(e) => setForm((p) => ({ ...p, reuniao_nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Data da reunião
                </Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl"
                  value={form.reuniao_data}
                  onChange={(e) => setForm((p) => ({ ...p, reuniao_data: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Link da gravação
              </Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="https://..."
                value={form.gravacao_url}
                onChange={(e) => setForm((p) => ({ ...p, gravacao_url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Próxima validação
              </Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="Ex.: Confirmar economia no próximo encontro"
                value={form.proxima_validacao}
                onChange={(e) => setForm((p) => ({ ...p, proxima_validacao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Observações
              </Label>
              <Textarea
                className="min-h-16 rounded-xl"
                placeholder="Contexto interno"
                value={form.observacoes}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              />
            </div>

            {erro && <p className="text-[12px] font-medium text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button
              className="h-11 w-full rounded-xl text-xs font-bold uppercase tracking-wider"
              disabled={salvando || !form.descricao_projeto.trim()}
              onClick={salvar}
            >
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar oportunidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VazioTotal({ onCriar }: { onCriar: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Sprout className="size-6 text-primary" />
      </div>
      <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">
        Ainda não há oportunidades registradas
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-[13px] font-medium leading-relaxed text-muted-foreground">
        Esta tela guarda as <strong className="text-foreground">possíveis vitórias futuras</strong>: projetos
        que apareceram numa reunião, estão em andamento no cliente, mas cujo resultado ainda não foi validado.
        Nada aqui é case nem pode virar material de venda — é o funil que a CS acompanha até a próxima
        validação confirmar o ganho.
      </p>
      <p className="mx-auto mt-3 max-w-xl text-[12px] font-medium text-muted-foreground/70">
        Registre o cliente, o que está sendo construído, o resultado esperado e quando isso será checado.
      </p>
      <Button className="mt-6 h-11 gap-2 rounded-xl px-6" onClick={onCriar}>
        <Plus className="size-4" />
        <span className="text-[11px] font-bold uppercase tracking-wider">Nova oportunidade</span>
      </Button>
    </div>
  )
}

function CardOportunidade({
  o,
  cliente,
  onEditar,
  onExcluir,
}: {
  o: VitrineOportunidade
  cliente: ClienteOpt | null
  onEditar: () => void
  onExcluir: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const empresa = exibivel(o.empresa_nome) ?? cliente?.empresa_nome ?? "Sem cliente vinculado"
  const data = formatarData(o.reuniao_data)
  const gravacao = exibivel(o.gravacao_url)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5">
      <div className="flex items-start gap-3">
        <LogoCliente
          empresa={empresa}
          logoPath={cliente?.logo_path}
          logoDisplayPath={cliente?.logo_display_path}
          className="size-12 shrink-0"
          classeIniciais="text-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold uppercase tracking-widest text-foreground">
            {nomeEmpresa(empresa)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {exibivel(o.status_atual) && (
              <Badge variant="outline" className="rounded-lg border-primary/30 px-2 py-0 text-[10px] font-bold text-primary">
                {exibivel(o.status_atual)}
              </Badge>
            )}
            {exibivel(o.cs_responsavel) && (
              <Badge variant="outline" className="rounded-lg border-border px-2 py-0 text-[10px] font-bold text-muted-foreground">
                CS {exibivel(o.cs_responsavel)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="size-8 rounded-lg p-0 text-muted-foreground hover:text-primary"
            onClick={onEditar}
            aria-label="Editar oportunidade"
          >
            <Edit3 className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 rounded-lg p-0 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmando((v) => !v)}
            aria-label="Excluir oportunidade"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {confirmando && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-[12px] font-medium text-foreground">Excluir esta oportunidade?</p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider text-destructive"
              onClick={onExcluir}
            >
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {exibivel(o.descricao_projeto) && (
        <p className="text-[13px] font-medium leading-relaxed text-foreground">
          {exibivel(o.descricao_projeto)}
        </p>
      )}

      <div className="space-y-2.5 rounded-xl border border-border bg-muted/10 p-3.5">
        <Campo
          icon={Target}
          label="Resultado esperado"
          valor={exibivel(o.resultado_esperado)}
        />
        <Campo
          icon={Calendar}
          label="Reunião"
          valor={[exibivel(o.reuniao_nome), data].filter(Boolean).join(" — ") || null}
        />
        <Campo icon={Lightbulb} label="Próxima validação" valor={exibivel(o.proxima_validacao)} />
        {exibivel(o.observacoes) && (
          <Campo icon={Lightbulb} label="Observações" valor={exibivel(o.observacoes)} />
        )}
      </div>

      {gravacao && (
        <a
          href={gravacao}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
        >
          <PlayCircle className="size-3.5" /> Abrir gravação
        </a>
      )}
    </div>
  )
}

function Campo({
  icon: Icon,
  label,
  valor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  valor: string | null
}) {
  if (!valor) return null
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <p className="text-[12px] font-medium leading-snug text-foreground">{valor}</p>
      </div>
    </div>
  )
}

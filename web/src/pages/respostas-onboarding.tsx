import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Download, Inbox, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  SearchIcon as Search,
  BriefcaseIcon as Briefcase,
  CheckCircle2Icon as CheckCircle2,
  XIcon,
} from "@/components/ui/icons"
import { downloadCSV, type CSVColumn } from "@/lib/csv"

type OnboardingStatus = "enviado" | "em_andamento"

interface OnboardingRow {
  id_cliente: string
  pais: "BR" | "US" | null
  nome_completo: string | null
  genero: string | null
  email: string | null
  data_nascimento: string | null
  whatsapp: string | null
  endereco: string | null
  cep: string | null
  uf: string | null
  estado_civil: string | null
  faixa_etaria: string | null
  formacao_academica: string | null
  empresa_nome: string | null
  nicho: string | null
  descricao_negocio: string | null
  site: string | null
  instagram: string | null
  faturamento_anual: string | null
  numero_funcionarios: string | null
  numero_gestores: string | null
  desafios: string | null
  motivo_nao_superou: string | null
  referencias_posicionamento: string | null
  meta_12_meses: string | null
  expectativas: string | null
  motivo_impedimento: string | null
  como_conheceu: string | null
  motivo_entrada: string | null
  tres_entregas: string | null
  resultado_final: string | null
  expectativa_galdino: string | null
  ia_kpis: boolean | null
  ia_dashboard: boolean | null
  ia_processos: boolean | null
  ia_agentes: boolean | null
  ia_sistema: boolean | null
  ia_interesses: string[] | null
  ia_outro: string | null
  step_atual: number | null
  status: OnboardingStatus | null
  nivel_ia: number | null
  created_at: string | null
  updated_at: string | null
  enviado_em: string | null
}

interface ClienteRow {
  id_cliente: string
  id_entrada: number
  nome_cliente_formatado: string | null
  nome_empresa_formatado: string | null
  status_atual: string | null
  sc: string | null
  codigo_cliente: number | null
}

interface RespostaCompleta extends OnboardingRow {
  cliente: ClienteRow | null
}

type TabKey = "enviadas" | "em-andamento"

const STEP_LABELS = [
  "1. Dados do Responsável",
  "2. Dados do Negócio",
  "3. Estrutura da Empresa",
  "4. Diagnóstico Empresarial",
  "5. Expectativas no PMC",
  "6. Maturidade em IA",
] as const

const STEP_FIELDS: { label: string; key: keyof OnboardingRow; multiline?: boolean }[][] = [
  [
    { label: "País", key: "pais" },
    { label: "Nome Completo", key: "nome_completo" },
    { label: "Gênero", key: "genero" },
    { label: "E-mail", key: "email" },
    { label: "Data de Nascimento", key: "data_nascimento" },
    { label: "WhatsApp / Telefone", key: "whatsapp" },
    { label: "Endereço", key: "endereco" },
    { label: "CEP / ZIP", key: "cep" },
    { label: "Estado (UF)", key: "uf" },
    { label: "Estado Civil", key: "estado_civil" },
    { label: "Faixa Etária", key: "faixa_etaria" },
    { label: "Formação Acadêmica", key: "formacao_academica" },
  ],
  [
    { label: "Empresa", key: "empresa_nome" },
    { label: "Nicho", key: "nicho" },
    { label: "Descrição do Negócio", key: "descricao_negocio", multiline: true },
    { label: "Site", key: "site" },
    { label: "Instagram", key: "instagram" },
  ],
  [
    { label: "Faturamento Anual", key: "faturamento_anual" },
    { label: "Nº de Funcionários", key: "numero_funcionarios" },
    { label: "Nº de Gestores", key: "numero_gestores" },
  ],
  [
    { label: "2 Principais Desafios", key: "desafios", multiline: true },
    { label: "Por que ainda não superou", key: "motivo_nao_superou", multiline: true },
    { label: "Referências de Posicionamento", key: "referencias_posicionamento" },
    { label: "Meta de Faturamento 12m", key: "meta_12_meses" },
  ],
  [
    { label: "Expectativas ao Entrar", key: "expectativas", multiline: true },
    { label: "Motivo que Quase Impediu", key: "motivo_impedimento", multiline: true },
    { label: "Como Conheceu o PMC", key: "como_conheceu" },
    { label: "Por que Decidiu Entrar", key: "motivo_entrada", multiline: true },
    { label: "3 Entregas Mais Importantes", key: "tres_entregas", multiline: true },
    { label: "Resultado Final Desejado", key: "resultado_final", multiline: true },
    { label: "O que Espera do Galdino (3m)", key: "expectativa_galdino", multiline: true },
  ],
  [
    { label: "Usa IA para KPIs?", key: "ia_kpis" },
    { label: "Usa IA em Dashboards?", key: "ia_dashboard" },
    { label: "Processos mapeados com IA?", key: "ia_processos" },
    { label: "Usa Agentes de IA?", key: "ia_agentes" },
    { label: "Sistemas integrados com IA?", key: "ia_sistema" },
    { label: "Conteúdos de Interesse", key: "ia_interesses" },
    { label: "Outro Interesse", key: "ia_outro", multiline: true },
  ],
]

const CSV_COLUMNS: CSVColumn<RespostaCompleta>[] = [
  { key: "codigo_cliente", label: "Código Cliente", format: (r) => r.cliente?.codigo_cliente ?? "" },
  { key: "empresa_formatada", label: "Empresa (CRM)", format: (r) => r.cliente?.nome_empresa_formatado ?? "" },
  { key: "cliente_formatado", label: "Cliente (CRM)", format: (r) => r.cliente?.nome_cliente_formatado ?? "" },
  { key: "status_atual", label: "Status CRM", format: (r) => r.cliente?.status_atual ?? "" },
  { key: "sc", label: "CS Responsável", format: (r) => r.cliente?.sc ?? "" },
  { key: "status", label: "Status Onboarding" },
  { key: "step_atual", label: "Etapa Atual" },
  { key: "nivel_ia", label: "Nível IA" },
  { key: "enviado_em", label: "Enviado em" },
  { key: "created_at", label: "Criado em" },
  { key: "updated_at", label: "Atualizado em" },
  { key: "pais", label: "País" },
  { key: "nome_completo", label: "Nome Completo" },
  { key: "genero", label: "Gênero" },
  { key: "email", label: "E-mail" },
  { key: "data_nascimento", label: "Data de Nascimento" },
  { key: "whatsapp", label: "WhatsApp / Telefone" },
  { key: "endereco", label: "Endereço" },
  { key: "cep", label: "CEP / ZIP" },
  { key: "uf", label: "Estado (UF)" },
  { key: "estado_civil", label: "Estado Civil" },
  { key: "faixa_etaria", label: "Faixa Etária" },
  { key: "formacao_academica", label: "Formação Acadêmica" },
  { key: "empresa_nome", label: "Empresa - Nome" },
  { key: "nicho", label: "Nicho" },
  { key: "descricao_negocio", label: "Descrição do Negócio" },
  { key: "site", label: "Site" },
  { key: "instagram", label: "Instagram" },
  { key: "faturamento_anual", label: "Faturamento Anual" },
  { key: "numero_funcionarios", label: "Nº Funcionários" },
  { key: "numero_gestores", label: "Nº Gestores" },
  { key: "desafios", label: "Principais Desafios" },
  { key: "motivo_nao_superou", label: "Por que não superou" },
  { key: "referencias_posicionamento", label: "Referências de Posicionamento" },
  { key: "meta_12_meses", label: "Meta 12 meses" },
  { key: "expectativas", label: "Expectativas" },
  { key: "motivo_impedimento", label: "Motivo que quase impediu" },
  { key: "como_conheceu", label: "Como conheceu o PMC" },
  { key: "motivo_entrada", label: "Motivo de Entrada" },
  { key: "tres_entregas", label: "3 Entregas Mais Importantes" },
  { key: "resultado_final", label: "Resultado Final Desejado" },
  { key: "expectativa_galdino", label: "Expectativa do Galdino" },
  { key: "ia_kpis", label: "IA - KPIs" },
  { key: "ia_dashboard", label: "IA - Dashboard" },
  { key: "ia_processos", label: "IA - Processos" },
  { key: "ia_agentes", label: "IA - Agentes" },
  { key: "ia_sistema", label: "IA - Sistemas" },
  { key: "ia_interesses", label: "IA - Interesses" },
  { key: "ia_outro", label: "IA - Outro" },
]

function fmtDataBR(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function PaisBadge({ pais }: { pais: "BR" | "US" | null }) {
  if (!pais) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span>{pais === "BR" ? "🇧🇷" : "🇺🇸"}</span>
      {pais}
    </span>
  )
}

function FieldDisplay({
  label,
  value,
  multiline,
}: {
  label: string
  value: unknown
  multiline?: boolean
}) {
  let rendered: React.ReactNode
  if (value === null || value === undefined || value === "") {
    rendered = <span className="text-muted-foreground italic">Não respondido</span>
  } else if (typeof value === "boolean") {
    rendered = (
      <span
        className={
          value
            ? "inline-flex items-center gap-1.5 text-primary font-semibold"
            : "inline-flex items-center gap-1.5 text-muted-foreground"
        }
      >
        {value ? <CheckCircle2 className="size-4" /> : <XIcon className="size-4" />}
        {value ? "Sim" : "Não"}
      </span>
    )
  } else if (Array.isArray(value)) {
    rendered = (
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <span className="text-muted-foreground italic">Não respondido</span>
        ) : (
          value.map((v, i) => (
            <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[11px]">
              {String(v)}
            </Badge>
          ))
        )}
      </div>
    )
  } else if (multiline) {
    rendered = (
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{String(value)}</p>
    )
  } else {
    rendered = <p className="text-sm text-foreground">{String(value)}</p>
  }

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-border/30 last:border-b-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-1">
        {label}
      </div>
      <div className="min-w-0">{rendered}</div>
    </div>
  )
}

export default function RespostasOnboardingPage() {
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get("tab") as TabKey | null) ?? "enviadas"
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RespostaCompleta[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selected, setSelected] = useState<RespostaCompleta | null>(null)

  function setTab(k: TabKey) {
    const next = new URLSearchParams(sp)
    next.set("tab", k)
    setSp(next, { replace: true })
    setSearchTerm("")
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [onbRes, cliRes] = await Promise.all([
        supabase
          .from("cliente_onboarding")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase
          .from("clientes_entrada_new")
          .select("id_cliente, id_entrada, nome_cliente_formatado, nome_empresa_formatado, status_atual, sc, codigo_cliente"),
      ])

      if (cancelled) return

      const onboardings = (onbRes.data ?? []) as OnboardingRow[]
      const clientes = (cliRes.data ?? []) as ClienteRow[]
      const clienteByCliente = new Map<string, ClienteRow>()
      clientes.forEach((c) => {
        if (c.id_cliente) clienteByCliente.set(c.id_cliente, c)
      })

      const merged: RespostaCompleta[] = onboardings.map((o) => ({
        ...o,
        cliente: clienteByCliente.get(o.id_cliente) ?? null,
      }))

      setRows(merged)
      setLoading(false)
    }

    void load()

    const channel = supabase
      .channel("respostas-onboarding")
      .on("postgres_changes", { event: "*", schema: "public", table: "cliente_onboarding" }, () => {
        void load()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const { enviadas, emAndamento } = useMemo(() => {
    const sent: RespostaCompleta[] = []
    const draft: RespostaCompleta[] = []
    rows.forEach((r) => {
      if (r.status === "enviado") sent.push(r)
      else if (r.status === "em_andamento") draft.push(r)
    })
    return { enviadas: sent, emAndamento: draft }
  }, [rows])

  const activeList = tab === "enviadas" ? enviadas : emAndamento

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return activeList
    return activeList.filter((r) => {
      const haystack = [
        r.cliente?.nome_empresa_formatado,
        r.cliente?.nome_cliente_formatado,
        r.empresa_nome,
        r.nome_completo,
        r.nicho,
        r.email,
        r.uf,
        r.endereco,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [activeList, searchTerm])

  function exportCSV() {
    if (filtered.length === 0) return
    const today = new Date().toISOString().slice(0, 10)
    const suffix = tab === "enviadas" ? "enviadas" : "em-andamento"
    downloadCSV(`respostas-onboarding-${suffix}-${today}.csv`, filtered, CSV_COLUMNS)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/3 bg-card/40 rounded-xl" />
        <div className="h-[500px] w-full bg-card/40 rounded-2xl" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1.5">PMC OS</div>
        <h1 className="text-4xl font-bold tracking-tight">Respostas de Onboarding</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Todas as respostas do formulário de onboarding dos clientes. Clique em qualquer linha pra ver as respostas completas, ou exporte tudo em CSV.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-muted/10 p-6 rounded-2xl border border-border/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, cliente, nicho, email..."
            className="pl-11 h-12 bg-background border-border focus-visible:border-primary/50 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="h-12 px-5 gap-2 text-xs font-bold uppercase tracking-wider"
        >
          <Download className="size-4" />
          Exportar CSV ({filtered.length})
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="w-full flex-wrap h-auto p-1">
          <TabsTrigger value="enviadas" className="flex-1 min-w-[160px]">
            <Inbox className="size-4" />
            Enviadas ({enviadas.length})
          </TabsTrigger>
          <TabsTrigger value="em-andamento" className="flex-1 min-w-[160px]">
            <Clock className="size-4" />
            Em andamento ({emAndamento.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviadas" className="mt-6">
          <RespostasTable rows={filtered} kind="enviadas" onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="em-andamento" className="mt-6">
          <RespostasTable rows={filtered} kind="em-andamento" onSelect={setSelected} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          {selected && (
            <>
              <SheetHeader className="border-b border-border/50 pb-4">
                <SheetTitle className="text-xl font-bold">
                  {selected.cliente?.nome_empresa_formatado ?? selected.empresa_nome ?? "—"}
                </SheetTitle>
                <SheetDescription className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selected.cliente?.nome_cliente_formatado ?? selected.nome_completo ?? "—"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge
                      variant="outline"
                      className={
                        selected.status === "enviado"
                          ? "border-primary/30 text-primary bg-primary/10 text-[10px] font-bold uppercase tracking-wider"
                          : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10 text-[10px] font-bold uppercase tracking-wider"
                      }
                    >
                      {selected.status === "enviado" ? "Enviado" : `Em andamento — Etapa ${selected.step_atual ?? 1}`}
                    </Badge>
                    {selected.nicho && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        {selected.nicho}
                      </Badge>
                    )}
                    <PaisBadge pais={selected.pais} />
                    {selected.cliente?.codigo_cliente != null && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        Cód. {selected.cliente.codigo_cliente}
                      </Badge>
                    )}
                  </div>
                  {selected.enviado_em && (
                    <span className="text-[11px] text-muted-foreground pt-1">
                      Enviado em {fmtDataBR(selected.enviado_em)}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-6">
                {STEP_LABELS.map((stepLabel, i) => (
                  <section key={stepLabel}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
                      {stepLabel}
                    </h3>
                    <div className="border border-border/50 rounded-xl bg-card/30 px-4">
                      {STEP_FIELDS[i].map((field) => (
                        <FieldDisplay
                          key={field.key}
                          label={field.label}
                          value={selected[field.key]}
                          multiline={field.multiline}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  )
}

function RespostasTable({
  rows,
  kind,
  onSelect,
}: {
  rows: RespostaCompleta[]
  kind: TabKey
  onSelect: (r: RespostaCompleta) => void
}) {
  return (
    <div className="border border-border bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-6">
              Empresa / Cliente
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              Nicho
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              País
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              {kind === "enviadas" ? "Enviado em" : "Etapa atual"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-16 text-muted-foreground font-medium">
                {kind === "enviadas"
                  ? "Nenhuma resposta enviada ainda."
                  : "Nenhum cliente preenchendo o formulário no momento."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow
                key={r.id_cliente}
                className="hover:bg-primary/5 border-b border-border/30 transition-colors cursor-pointer"
                onClick={() => onSelect(r)}
              >
                <TableCell className="py-5 px-6">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-foreground tracking-tight">
                      {r.cliente?.nome_empresa_formatado ?? r.empresa_nome ?? "—"}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                      <Briefcase className="size-3 text-primary/60" />
                      {r.cliente?.nome_cliente_formatado ?? r.nome_completo ?? "—"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {r.nicho ? (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                      {r.nicho}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <PaisBadge pais={r.pais} />
                </TableCell>
                <TableCell>
                  {kind === "enviadas" ? (
                    <span className="text-xs text-foreground font-medium">
                      {fmtDataBR(r.enviado_em)}
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10 text-[10px] font-bold uppercase tracking-wider"
                    >
                      Etapa {r.step_atual ?? 1} de 6
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import {
  ZapIcon,
  CalendarIcon,
  UsersIcon,
  ClockIcon,
  BriefcaseIcon,
  FileTextIcon,
  TargetIcon,
} from "@/components/ui/icons"

interface ExecutiveSummaryHeaderProps {
  clientId: string
}

interface SummaryData {
  galdinoFeitas: number | null
  galdinoTotal: number
  proxGaldino: string | null
  consultorTotal: number | null
  ultimaConsultor: string | null
  blackCrmAtiva: boolean | null
  contasBlackCrm: number | null
}

const GALDINO_TOTAL_DEFAULT = 12 // TODO: tornar dinâmico por cliente (cliente_informacoes_empresa.total_galdino?)

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}/${mm}/${yy}`
  } catch {
    return "—"
  }
}

export function ExecutiveSummaryHeader({ clientId }: ExecutiveSummaryHeaderProps) {
  const [data, setData] = useState<SummaryData>({
    galdinoFeitas: null,
    galdinoTotal: GALDINO_TOTAL_DEFAULT,
    proxGaldino: null,
    consultorTotal: null,
    ultimaConsultor: null,
    blackCrmAtiva: null,
    contasBlackCrm: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchAll() {
      const nowIso = new Date().toISOString()

      const [
        galdinoFeitasRes,
        proxGaldinoRes,
        consultorTotalRes,
        ultimaConsultorRes,
        clienteRes,
      ] = await Promise.all([
        supabase
          .from("reunioes_galdino")
          .select("id_cliente", { count: "exact", head: true })
          .eq("id_cliente", clientId)
          .eq("cliente_compareceu", true),
        supabase
          .from("reunioes_galdino")
          .select("data_reuniao")
          .eq("id_cliente", clientId)
          .gt("data_reuniao", nowIso)
          .order("data_reuniao", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("reunioes_mentoria_new")
          .select("id_cliente", { count: "exact", head: true })
          .eq("id_cliente", clientId)
          .eq("cliente_compareceu", true),
        supabase
          .from("reunioes_mentoria_new")
          .select("data_reuniao")
          .eq("id_cliente", clientId)
          .eq("cliente_compareceu", true)
          .lte("data_reuniao", nowIso)
          .order("data_reuniao", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("clientes_entrada_new")
          .select("tem_crm")
          .eq("id_cliente", clientId)
          .maybeSingle(),
      ])

      if (cancelled) return

      setData({
        galdinoFeitas: galdinoFeitasRes.error ? null : galdinoFeitasRes.count ?? 0,
        galdinoTotal: GALDINO_TOTAL_DEFAULT,
        proxGaldino: proxGaldinoRes.error ? null : proxGaldinoRes.data?.data_reuniao ?? null,
        consultorTotal: consultorTotalRes.error ? null : consultorTotalRes.count ?? 0,
        ultimaConsultor: ultimaConsultorRes.error ? null : ultimaConsultorRes.data?.data_reuniao ?? null,
        blackCrmAtiva: clienteRes.error ? null : !!clienteRes.data?.tem_crm,
        // TODO: definir fonte real de "Contas Black CRM" (tabela dedicada? count em outra?). Por ora 0.
        contasBlackCrm: 0,
      })
      setLoading(false)
    }

    fetchAll().catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [clientId])

  const cards = [
    {
      icon: CalendarIcon,
      label: "Reuniões Galdino",
      value:
        data.galdinoFeitas === null
          ? "—"
          : `${data.galdinoFeitas}/${data.galdinoTotal}`,
    },
    {
      icon: ClockIcon,
      label: "Próx. Galdino",
      value: formatDate(data.proxGaldino),
    },
    {
      icon: UsersIcon,
      label: "Reuniões Consultor",
      value: data.consultorTotal === null ? "—" : String(data.consultorTotal),
    },
    {
      icon: ClockIcon,
      label: "Última Consultor",
      value: formatDate(data.ultimaConsultor),
    },
    {
      icon: BriefcaseIcon,
      label: "Black CRM Ativa",
      value: data.blackCrmAtiva === null ? "—" : data.blackCrmAtiva ? "Sim" : "Não",
    },
    {
      icon: FileTextIcon,
      label: "Contas Black CRM",
      value: data.contasBlackCrm === null ? "—" : String(data.contasBlackCrm),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl bg-card/50 backdrop-blur-md border border-border p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <ZapIcon className="size-5 text-yellow-400" />
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Resumo Executivo do Cliente
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className="rounded-xl bg-muted/10 border border-border px-4 py-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {c.label}
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {loading ? <span className="text-muted-foreground/50">—</span> : c.value}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl bg-muted/10 border border-border px-4 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TargetIcon className="size-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Próxima Ação
          </span>
        </div>
        <div className="text-sm font-medium text-foreground">
          <span className="text-yellow-400">—</span>
        </div>
      </div>
    </motion.div>
  )
}

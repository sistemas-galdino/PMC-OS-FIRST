// Sino de notificações do cliente. Lê notificacoes (broadcast + próprias) e o
// estado de leitura por cliente; badge com não-lidas; clicar abre o link.
import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { BellIcon as Bell, CheckCheckIcon as CheckCheck, MegaphoneIcon as Megaphone, CalendarIcon as Calendar, ShieldCheckIcon as Shield } from "@/components/ui/icons"

interface Notif {
  id: string
  tipo: string
  titulo: string
  texto: string | null
  link: string | null
  created_at: string
  lida: boolean
}

const ICONE: Record<string, typeof Bell> = {
  novidade: Megaphone,
  reuniao: Calendar,
  guardiao: Shield,
}

function tempoRel(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "agora"
  const m = Math.floor(s / 60); if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60); if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24); if (d < 30) return `há ${d}d`
  return new Date(iso).toLocaleDateString("pt-BR")
}

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [itens, setItens] = useState<Notif[]>([])
  const ref = useRef<HTMLDivElement>(null)

  const carregar = useCallback(async () => {
    if (!user?.id) return
    const [{ data: notifs }, { data: lidas }] = await Promise.all([
      supabase
        .from("notificacoes")
        .select("id, tipo, titulo, texto, link, created_at")
        .or(`id_cliente.is.null,id_cliente.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("notificacao_leituras").select("id_notificacao").eq("id_cliente", user.id),
    ])
    const lidasSet = new Set((lidas ?? []).map((l: { id_notificacao: string }) => l.id_notificacao))
    setItens((notifs ?? []).map((n: any) => ({ ...n, lida: lidasSet.has(n.id) })))
  }, [user?.id])

  useEffect(() => { carregar() }, [carregar])

  // Realtime: badge acende na hora em que a notificação nasce (INSERT na tabela).
  useEffect(() => {
    if (!user?.id) return
    const canal = supabase
      .channel("notificacoes-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes" },
        (payload) => {
          const n: any = payload.new
          // broadcast (id_cliente null) ou dirigida a mim
          if (n.id_cliente == null || n.id_cliente === user.id) {
            setItens((prev) => prev.some((x) => x.id === n.id) ? prev : [{ ...n, lida: false }, ...prev].slice(0, 20))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [user?.id])

  // fecha ao clicar fora
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (aberto && ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [aberto])

  const naoLidas = itens.filter((n) => !n.lida).length

  async function marcarLida(n: Notif) {
    if (!user?.id || n.lida) return
    setItens((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))
    await supabase.from("notificacao_leituras").upsert(
      { id_notificacao: n.id, id_cliente: user.id },
      { onConflict: "id_notificacao,id_cliente" }
    )
  }

  async function abrir(n: Notif) {
    await marcarLida(n)
    setAberto(false)
    if (n.link) navigate(n.link)
  }

  async function marcarTodas() {
    if (!user?.id) return
    const pendentes = itens.filter((n) => !n.lida)
    if (!pendentes.length) return
    setItens((prev) => prev.map((x) => ({ ...x, lida: true })))
    await supabase.from("notificacao_leituras").upsert(
      pendentes.map((n) => ({ id_notificacao: n.id, id_cliente: user!.id })),
      { onConflict: "id_notificacao,id_cliente" }
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setAberto((v) => !v); if (!aberto) carregar() }}
        className="relative size-9 rounded-xl flex items-center justify-center text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors bg-background/20 backdrop-blur-md border border-border/50 shadow-lg"
        aria-label="Notificações"
      >
        <Bell className="size-4.5" />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <p className="text-sm font-bold tracking-tight">Notificações</p>
            {naoLidas > 0 && (
              <button onClick={marcarTodas} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="size-3.5" /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {itens.length === 0 ? (
              <div className="py-12 text-center px-6">
                <Bell className="size-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] font-medium text-muted-foreground">Nenhuma notificação por aqui.</p>
              </div>
            ) : (
              itens.map((n) => {
                const Icon = ICONE[n.tipo] ?? Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => abrir(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/30 transition-colors ${n.lida ? "" : "bg-primary/[0.04]"}`}
                  >
                    <div className={`shrink-0 mt-0.5 size-8 rounded-lg flex items-center justify-center ${n.lida ? "bg-muted/40 text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] leading-snug ${n.lida ? "font-medium text-foreground/80" : "font-bold text-foreground"}`}>{n.titulo}</p>
                      {n.texto && <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{n.texto}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{tempoRel(n.created_at)}</p>
                    </div>
                    {!n.lida && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

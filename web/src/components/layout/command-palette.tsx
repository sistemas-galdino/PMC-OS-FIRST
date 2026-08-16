// Busca global / command palette (⌘K ou Ctrl+K). Navega para qualquer
// destino do app; para admin, também busca clientes pelo nome.
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { SearchIcon as Search, ArrowUpRightIcon as ArrowUpRight, UsersIcon as Users } from "@/components/ui/icons"

interface Destino { label: string; url: string; grupo: string }

const ROTAS_CLIENTE: Destino[] = [
  { label: "Minha Jornada", url: "/inicio", grupo: "Início" },
  { label: "Informações da Empresa", url: "/informacoes-empresa", grupo: "Meu Negócio" },
  { label: "Mapeamento", url: "/mapeamento", grupo: "Meu Negócio" },
  { label: "Método MC", url: "/metodo", grupo: "Execução" },
  { label: "Ações", url: "/acoes", grupo: "Execução" },
  { label: "Meu Time", url: "/meu-time", grupo: "Execução" },
  { label: "Central de Vitórias", url: "/vitorias", grupo: "Acompanhamento" },
  { label: "Reuniões", url: "/reunioes", grupo: "Acompanhamento" },
  { label: "Guardião da IA", url: "/guardiao", grupo: "Acompanhamento" },
  { label: "Novidades", url: "/novidades", grupo: "Comunidade" },
  { label: "Ranking dos Guardiões", url: "/ranking-guardioes", grupo: "Comunidade" },
  { label: "Trilhas", url: "/trilhas", grupo: "Conhecimento" },
  { label: "Estudos de Caso", url: "/estudos-caso", grupo: "Conhecimento" },
  { label: "Multiplicadores", url: "/multiplicadores", grupo: "Conhecimento" },
  { label: "Skills", url: "/skills", grupo: "Conhecimento" },
  { label: "Encontros ao Vivo", url: "/calendario", grupo: "Conhecimento" },
  { label: "Links Importantes", url: "/recursos", grupo: "Recursos" },
  { label: "Ferramentas IA", url: "/ferramentas", grupo: "Recursos" },
  { label: "Balanço PMC", url: "/balanco", grupo: "Acompanhamento" },
  { label: "Meu Nível PMC", url: "/niveis", grupo: "Acompanhamento" },
]

const ROTAS_ADMIN: Destino[] = [
  { label: "Dashboard Principal", url: "/", grupo: "Visão Geral" },
  { label: "Visão Geral 2", url: "/dashboard-2", grupo: "Visão Geral" },
  { label: "Agente", url: "/agente", grupo: "Visão Geral" },
  { label: "Clientes", url: "/clientes", grupo: "Clientes & CRM" },
  { label: "CRM", url: "/crm", grupo: "Clientes & CRM" },
  { label: "Funis", url: "/funis", grupo: "Clientes & CRM" },
  { label: "Canais de Vendas", url: "/canais-vendas", grupo: "Vendas" },
  { label: "Acessos", url: "/acessos", grupo: "Clientes & CRM" },
  { label: "Pendentes Onboarding", url: "/onboarding", grupo: "Onboarding" },
  { label: "Respostas de Onboarding", url: "/respostas-onboarding", grupo: "Onboarding" },
  { label: "Central de Atendimentos", url: "/central-atendimentos", grupo: "Atendimento" },
  { label: "Central do Sucesso do Cliente", url: "/central-sucesso-cliente", grupo: "Atendimento" },
  { label: "Consultores", url: "/mentores", grupo: "Atendimento" },
  { label: "Guardião (Clientes)", url: "/guardiao-admin", grupo: "Atendimento" },
  { label: "Reuniões Galdino", url: "/reunioes-galdino", grupo: "Reuniões" },
  { label: "Reuniões Black CRM", url: "/reunioes-blackcrm", grupo: "Reuniões" },
  { label: "Encontros ao Vivo", url: "/calendario", grupo: "Reuniões" },
  { label: "Roadmap de Sistemas", url: "/roadmap-sistemas", grupo: "Sistemas" },
  { label: "Novidades (admin)", url: "/novidades-admin", grupo: "Conteúdo" },
  { label: "Repositório de Vitórias", url: "/repositorio-vitorias", grupo: "Conteúdo" },
  { label: "Estudos de Caso (admin)", url: "/estudos-caso-admin", grupo: "Conteúdo" },
  { label: "Multiplicadores (admin)", url: "/multiplicadores-admin", grupo: "Conteúdo" },
  { label: "Skills (admin)", url: "/skills-admin", grupo: "Conteúdo" },
  { label: "Configurações", url: "/configuracoes", grupo: "Sistema" },
]

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

const EVENTO_ABRIR = "pmc:open-search"

export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR))}
      className="h-9 rounded-xl flex items-center gap-2 px-3 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors bg-background/20 backdrop-blur-md border border-border/50 shadow-lg"
      aria-label="Buscar"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline text-[12px] font-medium">Buscar</span>
      <kbd className="hidden sm:inline text-[10px] font-mono bg-muted/50 rounded px-1.5 py-0.5 border border-border/60">⌘K</kbd>
    </button>
  )
}

interface ClienteHit { id: string; nome: string; empresa: string | null }

export function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [q, setQ] = useState("")
  const [sel, setSel] = useState(0)
  const [clientes, setClientes] = useState<ClienteHit[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { can } = useAuth()
  // RBAC: esconde da busca as seções admin que o papel não libera.
  const secaoDaUrl = (url: string): string | null =>
    url === "/" ? null : url === "/mentores" ? "consultores" : url === "/time-permissoes" ? "permissoes" : url.replace(/^\//, "")
  const rotas = isAdmin
    ? ROTAS_ADMIN.filter((r) => { const c = secaoDaUrl(r.url); return c === null || can(c) })
    : ROTAS_CLIENTE

  // abrir/fechar via ⌘K, Ctrl+K e evento do trigger
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setAberto((v) => !v)
      } else if (e.key === "Escape") {
        setAberto(false)
      }
    }
    function onOpen() { setAberto(true) }
    window.addEventListener("keydown", onKey)
    window.addEventListener(EVENTO_ABRIR, onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(EVENTO_ABRIR, onOpen)
    }
  }, [])

  useEffect(() => {
    if (aberto) {
      setQ(""); setSel(0); setClientes([])
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [aberto])

  // busca de clientes (só admin, query >= 2 chars)
  useEffect(() => {
    if (!isAdmin || q.trim().length < 2) { setClientes([]); return }
    let cancel = false
    const t = setTimeout(async () => {
      const termo = q.trim()
      const { data } = await supabase
        .from("clientes_entrada_new")
        .select("id_cliente, nome_cliente_formatado, nome_empresa_formatado")
        .or(`nome_cliente_formatado.ilike.%${termo}%,nome_empresa_formatado.ilike.%${termo}%`)
        .limit(6)
      if (!cancel) {
        setClientes((data ?? []).map((c: any) => ({
          id: c.id_cliente, nome: c.nome_cliente_formatado || c.nome_empresa_formatado || "—", empresa: c.nome_empresa_formatado,
        })))
      }
    }, 200)
    return () => { cancel = true; clearTimeout(t) }
  }, [q, isAdmin])

  const rotasFiltradas = useMemo(() => {
    const termo = norm(q.trim())
    if (!termo) return rotas
    return rotas.filter((r) => norm(r.label + " " + r.grupo).includes(termo))
  }, [q, rotas])

  // lista unificada para navegação por teclado: rotas + clientes
  const total = rotasFiltradas.length + clientes.length

  function irPara(i: number) {
    if (i < rotasFiltradas.length) {
      navigate(rotasFiltradas[i].url)
    } else {
      const c = clientes[i - rotasFiltradas.length]
      if (c) navigate(`/cliente/${c.id}`)
    }
    setAberto(false)
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, total - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); if (total > 0) irPara(sel) }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm" onMouseDown={() => setAberto(false)}>
      <div className="w-full max-w-xl rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-border/60">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0) }}
            onKeyDown={onInputKey}
            placeholder={isAdmin ? "Buscar páginas ou clientes..." : "Buscar páginas..."}
            className="flex-1 h-12 bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground/60"
          />
          <kbd className="text-[10px] font-mono bg-muted/50 rounded px-1.5 py-0.5 border border-border/60 text-muted-foreground">esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {total === 0 && (
            <p className="text-center text-[13px] text-muted-foreground py-8">Nada encontrado para "{q}".</p>
          )}

          {rotasFiltradas.length > 0 && (
            <div className="px-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1.5">Ir para</p>
              {rotasFiltradas.map((r, i) => (
                <button
                  key={r.url}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => irPara(i)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left ${sel === i ? "bg-primary/10" : "hover:bg-muted/40"}`}
                >
                  <span className="text-[13px] font-medium text-foreground">{r.label}</span>
                  <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {r.grupo}<ArrowUpRight className="size-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {clientes.length > 0 && (
            <div className="px-2 mt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1.5">Clientes</p>
              {clientes.map((c, j) => {
                const i = rotasFiltradas.length + j
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => irPara(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${sel === i ? "bg-primary/10" : "hover:bg-muted/40"}`}
                  >
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{c.nome}</p>
                      {c.empresa && c.empresa !== c.nome && <p className="text-[11px] text-muted-foreground truncate">{c.empresa}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

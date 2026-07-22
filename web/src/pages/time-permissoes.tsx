// Time & Permissões — control panel do RBAC (Fase 1). Super Admin gere os papéis
// dos membros do time e faz o ajuste fino de quais seções cada um vê.
//
// Modelo (ver migration 20260720_rbac_time.sql):
//   papeis "full" (super_admin/admin) => veem todas as seções.
//   papeis limitados => template (papel_secoes) ± override por pessoa (mentor_secao_override).
// Toggle de seção: se o desejado bate com o template, remove o override; senão grava override.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  ShieldCheckIcon as ShieldCheck,
  UsersIcon as Users,
  ChevronRightIcon as ChevronRight,
  CheckCircle2Icon as CheckCircle2,
  AlertCircleIcon as AlertCircle,
  PlusIcon as Plus,
} from "@/components/ui/icons"

interface Papel { chave: string; nome: string; descricao: string | null; is_full: boolean; is_super: boolean; ordem: number }
interface Secao { chave: string; label: string; grupo: string; ordem: number; sensivel: boolean }
interface Membro { id: number; nome: string | null; email: string | null; papel: string }
interface Override { mentor_id: number; secao_chave: string; permitir: boolean }

export default function TimePermissoesPage() {
  const { isSuperAdmin, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [papeis, setPapeis] = useState<Papel[]>([])
  const [secoes, setSecoes] = useState<Secao[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [templates, setTemplates] = useState<Record<string, Set<string>>>({})
  const [overrides, setOverrides] = useState<Record<number, Record<string, boolean>>>({})
  const [expandido, setExpandido] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Adicionar membro
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addNome, setAddNome] = useState("")
  const [addPapel, setAddPapel] = useState("consultor")
  const [addResult, setAddResult] = useState<{ ok: boolean; msg: string; link?: string } | null>(null)

  async function carregar() {
    const [pRes, sRes, mRes, tRes, oRes] = await Promise.all([
      supabase.from("papeis").select("*").order("ordem"),
      supabase.from("secoes_catalogo").select("*").order("ordem"),
      supabase.from("mentores").select("id, nome, email, papel").order("nome"),
      supabase.from("papel_secoes").select("papel_chave, secao_chave"),
      supabase.from("mentor_secao_override").select("mentor_id, secao_chave, permitir"),
    ])
    setPapeis((pRes.data ?? []) as Papel[])
    setSecoes((sRes.data ?? []) as Secao[])
    setMembros((mRes.data ?? []) as Membro[])
    const tpl: Record<string, Set<string>> = {}
    for (const r of (tRes.data ?? []) as any[]) {
      (tpl[r.papel_chave] ??= new Set()).add(r.secao_chave)
    }
    setTemplates(tpl)
    const ov: Record<number, Record<string, boolean>> = {}
    for (const r of (oRes.data ?? []) as Override[]) {
      (ov[r.mentor_id] ??= {})[r.secao_chave] = r.permitir
    }
    setOverrides(ov)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const papelDe = (chave: string) => papeis.find((p) => p.chave === chave)

  // Seção efetiva de um membro (respeita full, template e overrides).
  function temSecao(m: Membro, secao: string): boolean {
    const p = papelDe(m.papel)
    if (p?.is_full) return true
    const noTemplate = templates[m.papel]?.has(secao) ?? false
    const ov = overrides[m.id]?.[secao]
    if (ov === undefined) return noTemplate
    return ov
  }

  async function adicionarMembro() {
    if (!addEmail.trim()) return
    setSalvando(true)
    setAddResult(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provisionar-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token ?? ""}` },
        body: JSON.stringify({ tipo: "membro", email: addEmail.trim(), nome: addNome.trim() || null, papel: addPapel, app_url: window.location.origin }),
      })
      const data = await res.json()
      if (!res.ok) {
        const bruto = String(data.error || "")
        const jaExiste = res.status === 409 || res.status === 422 || /(already|exist|regist|duplic|já (existe|cadastr|tem))/i.test(bruto)
        setAddResult({ ok: false, msg: jaExiste
          ? "Esse e-mail já tem login. Peça para a pessoa acessar, ou vincule pelo painel."
          : (bruto || "Erro ao provisionar membro.") })
      } else {
        setAddResult({ ok: true, msg: "Membro criado. Envie o link de acesso:", link: data.invite_link })
        setAddEmail(""); setAddNome("")
        await carregar()
      }
    } catch (e) {
      setAddResult({ ok: false, msg: (e as Error).message })
    }
    setSalvando(false)
  }

  async function trocarPapel(m: Membro, novo: string) {
    setSalvando(true)
    const { error } = await supabase.from("mentores").update({ papel: novo }).eq("id", m.id)
    if (!error) setMembros((prev) => prev.map((x) => x.id === m.id ? { ...x, papel: novo } : x))
    setSalvando(false)
  }

  async function toggleSecao(m: Membro, secao: string) {
    const desejado = !temSecao(m, secao)
    const noTemplate = templates[m.papel]?.has(secao) ?? false
    setSalvando(true)
    if (desejado === noTemplate) {
      // volta ao padrão do papel → remove override
      await supabase.from("mentor_secao_override").delete().eq("mentor_id", m.id).eq("secao_chave", secao)
      setOverrides((prev) => {
        const next = { ...prev, [m.id]: { ...(prev[m.id] ?? {}) } }
        delete next[m.id][secao]
        return next
      })
    } else {
      await supabase.from("mentor_secao_override").upsert(
        { mentor_id: m.id, secao_chave: secao, permitir: desejado },
        { onConflict: "mentor_id,secao_chave" },
      )
      setOverrides((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] ?? {}), [secao]: desejado } }))
    }
    setSalvando(false)
  }

  const grupos = useMemo(() => {
    const g: Record<string, Secao[]> = {}
    for (const s of secoes) (g[s.grupo] ??= []).push(s)
    return Object.entries(g)
  }, [secoes])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-1/2 bg-card/40 rounded-2xl animate-pulse" />
        <div className="h-96 bg-card/40 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Time & Permissões"
        description="Defina o papel de cada membro do time e ajuste, pessoa a pessoa, quais seções ele acessa."
      />

      {!isSuperAdmin && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3 text-[13px] text-amber-300 font-medium">
            <AlertCircle className="size-4 shrink-0" />
            Só um <b>Super Admin</b> pode editar papéis e permissões. Você está vendo em modo leitura.
          </CardContent>
        </Card>
      )}

      {/* Papéis (referência) */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Papéis</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {papeis.map((p) => (
            <Card key={p.chave}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[14px] font-bold text-foreground">{p.nome}</p>
                  {p.is_super && <Badge className="rounded-md bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-bold">super</Badge>}
                  {p.is_full && !p.is_super && <Badge className="rounded-md bg-sky-500/10 text-sky-400 border-sky-500/20 px-2 py-0.5 text-[10px] font-bold">acesso total</Badge>}
                </div>
                {p.descricao && <p className="text-[12px] text-muted-foreground">{p.descricao}</p>}
                {!p.is_full && (
                  <p className="text-[11px] text-muted-foreground mt-2">{templates[p.chave]?.size ?? 0} seções no padrão</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Membros */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex p-2 rounded-lg bg-primary/10 text-primary"><Users className="size-4" /></div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Membros do time</h2>
              <p className="text-[13px] text-muted-foreground font-medium">{membros.length} pessoas</p>
            </div>
          </div>
          <button
            onClick={() => { setShowAdd((v) => !v); setAddResult(null) }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" /> Adicionar membro
          </button>
        </div>

        {showAdd && (
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-4">
              <p className="text-[13px] font-semibold text-foreground">Novo membro do time</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="email" placeholder="E-mail" value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="rounded-lg bg-card border border-border px-3 py-2 text-[13px] text-foreground"
                />
                <input
                  type="text" placeholder="Nome" value={addNome}
                  onChange={(e) => setAddNome(e.target.value)}
                  className="rounded-lg bg-card border border-border px-3 py-2 text-[13px] text-foreground"
                />
                <select
                  value={addPapel} onChange={(e) => setAddPapel(e.target.value)}
                  className="rounded-lg bg-card border border-border px-3 py-2 text-[13px] font-semibold text-foreground"
                >
                  {papeis.filter((p) => !p.is_super).map((p) => <option key={p.chave} value={p.chave}>{p.nome}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={adicionarMembro} disabled={salvando || !addEmail.trim()}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-[12px] font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {salvando ? "Criando…" : "Criar e gerar link"}
                </button>
                <span className="text-[11px] text-muted-foreground">Cria o login e gera um link de definição de senha pra você enviar.</span>
              </div>
              {addResult && (
                <div className={`rounded-lg p-3 text-[12px] ${addResult.ok ? "bg-primary/10 text-foreground" : "bg-destructive/10 text-destructive"}`}>
                  <p className="font-medium">{addResult.msg}</p>
                  {addResult.link && (
                    <input
                      readOnly value={addResult.link} onFocus={(e) => e.target.select()}
                      className="mt-2 w-full rounded-md bg-background border border-border px-2 py-1.5 text-[11px] text-muted-foreground font-mono"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2.5">
          {membros.map((m) => {
            const p = papelDe(m.papel)
            const aberto = expandido === m.id
            const nSecoes = p?.is_full ? secoes.length : secoes.filter((s) => temSecao(m, s.chave)).length
            const ehEu = !!user?.email && !!m.email && m.email.toLowerCase() === user.email.toLowerCase()
            return (
              <Card key={m.id}>
                <CardContent className="p-0">
                  {/* Linha do membro */}
                  <div className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground truncate">{m.nome || m.email || "—"}</p>
                      {m.email && <p className="text-[12px] text-muted-foreground truncate">{m.email}</p>}
                    </div>

                    {/* Papel */}
                    <select
                      value={m.papel}
                      disabled={!isSuperAdmin || salvando || ehEu}
                      title={ehEu ? "Você não pode alterar o seu próprio papel" : undefined}
                      onChange={(e) => trocarPapel(m, e.target.value)}
                      className="rounded-lg bg-card border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground disabled:opacity-60"
                    >
                      {papeis.map((pp) => <option key={pp.chave} value={pp.chave}>{pp.nome}</option>)}
                    </select>

                    <Badge className="rounded-md bg-muted/40 text-muted-foreground border-transparent px-2 py-0.5 text-[11px] font-semibold">
                      {p?.is_full ? "todas as seções" : `${nSecoes} seções`}
                    </Badge>

                    {/* Expandir (só faz sentido p/ papel limitado) */}
                    <button
                      onClick={() => setExpandido(aberto ? null : m.id)}
                      disabled={p?.is_full}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary disabled:text-muted-foreground/40"
                    >
                      Seções <ChevronRight className={`size-4 transition-transform ${aberto ? "rotate-90" : ""}`} />
                    </button>
                  </div>

                  {/* Editor de seções */}
                  {aberto && !p?.is_full && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border/50 p-4 space-y-4">
                      {grupos.map(([grupo, lista]) => (
                        <div key={grupo}>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{grupo}</p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {lista.map((s) => {
                              const on = temSecao(m, s.chave)
                              const override = overrides[m.id]?.[s.chave] !== undefined
                              return (
                                <button
                                  key={s.chave}
                                  disabled={!isSuperAdmin || salvando}
                                  onClick={() => toggleSecao(m, s.chave)}
                                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60 ${on ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"}`}
                                >
                                  {on
                                    ? <CheckCircle2 className="size-4 text-primary shrink-0" />
                                    : <div className="size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                                  <span className={`text-[13px] font-medium flex-1 ${on ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                                  {s.sensivel && <ShieldCheck className="size-3.5 text-amber-400/70 shrink-0" />}
                                  {override && <span className="text-[9px] font-bold uppercase text-primary/70">edit</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        <ShieldCheck className="size-3 inline mr-1 text-amber-400/70" /> Seções marcadas são sensíveis — além de esconder na interface, o acesso ao dado é bloqueado no banco.
      </p>
    </div>
  )
}

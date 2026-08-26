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
  Trash2Icon as Trash2,
} from "@/components/ui/icons"

interface Papel { chave: string; nome: string; descricao: string | null; is_full: boolean; is_super: boolean; ordem: number }
interface Secao { chave: string; label: string; grupo: string; ordem: number; sensivel: boolean }
interface Membro { id: number; nome: string | null; email: string | null; papel: string; carteira_sc: string | null }
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
  // Excluir membro (Super Admin) — confirmação inline por linha.
  const [confirmarRemover, setConfirmarRemover] = useState<number | null>(null)
  const [removendo, setRemovendo] = useState<number | null>(null)
  const [removerErro, setRemoverErro] = useState<string | null>(null)
  // Editar nome
  const [editNomeId, setEditNomeId] = useState<number | null>(null)
  const [editNomeVal, setEditNomeVal] = useState("")
  // Carteiras de CS existentes (os `sc` gravados nos clientes) + "nova CS"
  const [carteiras, setCarteiras] = useState<string[]>([])
  const [novaCarteiraId, setNovaCarteiraId] = useState<number | null>(null)
  const [novaCarteiraVal, setNovaCarteiraVal] = useState("")
  const [addCarteira, setAddCarteira] = useState("")

  async function carregar() {
    const [pRes, sRes, mRes, tRes, oRes, cRes] = await Promise.all([
      supabase.from("papeis").select("*").order("ordem"),
      supabase.from("secoes_catalogo").select("*").order("ordem"),
      supabase.from("mentores").select("id, nome, email, papel, carteira_sc").order("nome"),
      supabase.from("papel_secoes").select("papel_chave, secao_chave"),
      supabase.from("mentor_secao_override").select("mentor_id, secao_chave, permitir"),
      // Carteiras que já existem nos clientes: é contra este texto que o CRM
      // casa a carteira da CS, então a lista sai do dado real, não de um enum.
      supabase.from("clientes_entrada_new").select("sc"),
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
    const doBanco = ((cRes.data ?? []) as { sc: string | null }[])
      .map((c) => (c.sc ?? "").trim())
      .filter(Boolean)
    const jaVinculadas = ((mRes.data ?? []) as Membro[])
      .map((m) => (m.carteira_sc ?? "").trim())
      .filter(Boolean)
    setCarteiras([...new Set([...doBanco, ...jaVinculadas])].sort((a, b) => a.localeCompare(b, "pt-BR")))
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
        body: JSON.stringify({ tipo: "membro", email: addEmail.trim(), nome: addNome.trim() || null, papel: addPapel, carteira_sc: addPapel === "cs" ? (addCarteira.trim() || null) : null, app_url: window.location.origin }),
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
        setAddEmail(""); setAddNome(""); setAddCarteira("")
        await carregar()
      }
    } catch (e) {
      setAddResult({ ok: false, msg: (e as Error).message })
    }
    setSalvando(false)
  }

  async function salvarNome(m: Membro) {
    const novo = editNomeVal.trim() || null
    setSalvando(true)
    const { error } = await supabase.from("mentores").update({ nome: novo }).eq("id", m.id)
    if (!error) setMembros((prev) => prev.map((x) => x.id === m.id ? { ...x, nome: novo } : x))
    setEditNomeId(null)
    setSalvando(false)
  }

  // Vincula o acesso a uma carteira. É isso que faz o CRM da pessoa mostrar os
  // clientes dela: sem vínculo o Meu Dia dela não sabe quem ela é.
  async function salvarCarteira(m: Membro, valor: string | null) {
    const novo = valor?.trim() || null
    setSalvando(true)
    const { error } = await supabase.from("mentores").update({ carteira_sc: novo }).eq("id", m.id)
    if (!error) {
      setMembros((prev) => prev.map((x) => x.id === m.id ? { ...x, carteira_sc: novo } : x))
      if (novo && !carteiras.includes(novo)) {
        setCarteiras((prev) => [...prev, novo].sort((a, b) => a.localeCompare(b, "pt-BR")))
      }
    }
    setNovaCarteiraId(null)
    setNovaCarteiraVal("")
    setSalvando(false)
  }

  async function trocarPapel(m: Membro, novo: string) {
    setSalvando(true)
    const { error } = await supabase.from("mentores").update({ papel: novo }).eq("id", m.id)
    if (!error) setMembros((prev) => prev.map((x) => x.id === m.id ? { ...x, papel: novo } : x))
    setSalvando(false)
  }

  // Exclui o membro por completo (equipe + login) via edge function service-role.
  async function removerMembro(m: Membro) {
    setRemovendo(m.id)
    setRemoverErro(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remover-membro`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token ?? ""}` },
        body: JSON.stringify({ id: m.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRemoverErro(String(data.error || "Erro ao excluir membro."))
      } else {
        setMembros((prev) => prev.filter((x) => x.id !== m.id))
        setConfirmarRemover(null)
      }
    } catch (e) {
      setRemoverErro((e as Error).message)
    }
    setRemovendo(null)
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
              {addPapel === "cs" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    value={carteiras.includes(addCarteira) || addCarteira === "" ? addCarteira : "__nova__"}
                    onChange={(e) => setAddCarteira(e.target.value === "__nova__" ? " " : e.target.value)}
                    className="rounded-lg bg-card border border-border px-3 py-2 text-[13px] font-semibold text-foreground"
                  >
                    <option value="">Carteira: escolher depois</option>
                    {carteiras.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__nova__">+ Nova CS…</option>
                  </select>
                  {!carteiras.includes(addCarteira) && addCarteira !== "" && (
                    <input
                      type="text" placeholder="Nome da nova CS" value={addCarteira.trim()} autoFocus
                      onChange={(e) => setAddCarteira(e.target.value)}
                      className="rounded-lg bg-card border border-primary/40 px-3 py-2 text-[13px] text-foreground"
                    />
                  )}
                  <span className="text-[11px] text-muted-foreground self-center">
                    A carteira é o nome que aparece nos clientes (campo CS) — é ela que define o que a pessoa vê no CRM.
                  </span>
                </div>
              )}
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
                      {editNomeId === m.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editNomeVal} onChange={(e) => setEditNomeVal(e.target.value)} autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") salvarNome(m); if (e.key === "Escape") setEditNomeId(null) }}
                            placeholder="Nome"
                            className="rounded-md bg-card border border-primary/40 px-2 py-1 text-[13px] text-foreground"
                          />
                          <button onClick={() => salvarNome(m)} className="text-[11px] font-bold uppercase tracking-wider text-primary">Salvar</button>
                          <button onClick={() => setEditNomeId(null)} className="text-[11px] uppercase tracking-wider text-muted-foreground">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-bold text-foreground truncate">{m.nome || m.email || "—"}</p>
                          {isSuperAdmin && (
                            <button onClick={() => { setEditNomeId(m.id); setEditNomeVal(m.nome || "") }}
                              className="text-[11px] text-muted-foreground hover:text-primary shrink-0">editar</button>
                          )}
                        </div>
                      )}
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

                    {/* Carteira: só faz sentido para CS, que é quem tem clientes
                        marcados no nome dela em clientes_entrada_new.sc. */}
                    {m.papel === "cs" && (
                      novaCarteiraId === m.id ? (
                        <div className="inline-flex items-center gap-2">
                          <input
                            value={novaCarteiraVal}
                            onChange={(e) => setNovaCarteiraVal(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") salvarCarteira(m, novaCarteiraVal)
                              if (e.key === "Escape") { setNovaCarteiraId(null); setNovaCarteiraVal("") }
                            }}
                            placeholder="Nome da nova CS"
                            className="rounded-lg bg-card border border-primary/40 px-2 py-1.5 text-[12px] text-foreground"
                          />
                          <button onClick={() => salvarCarteira(m, novaCarteiraVal)} className="text-[11px] font-bold uppercase tracking-wider text-primary">Salvar</button>
                          <button onClick={() => { setNovaCarteiraId(null); setNovaCarteiraVal("") }} className="text-[11px] uppercase tracking-wider text-muted-foreground">Cancelar</button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <select
                            value={m.carteira_sc ?? ""}
                            disabled={!isSuperAdmin || salvando}
                            title="Qual CS é este acesso: define a carteira que ela vê no CRM"
                            onChange={(e) => {
                              if (e.target.value === "__nova__") { setNovaCarteiraId(m.id); setNovaCarteiraVal("") }
                              else salvarCarteira(m, e.target.value || null)
                            }}
                            className={`rounded-lg bg-card border px-3 py-1.5 text-[12px] font-semibold text-foreground disabled:opacity-60 ${m.carteira_sc ? "border-border" : "border-amber-500/50"}`}
                          >
                            <option value="">Carteira: não vinculada</option>
                            {carteiras.map((c) => <option key={c} value={c}>{c}</option>)}
                            <option value="__nova__">+ Nova CS…</option>
                          </select>
                          {!m.carteira_sc && (
                            <Badge className="rounded-md bg-amber-500/10 text-amber-500 border-transparent px-2 py-0.5 text-[11px] font-semibold">
                              sem carteira
                            </Badge>
                          )}
                        </div>
                      )
                    )}

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

                    {/* Excluir membro + login (Super Admin, menos você mesmo) */}
                    {isSuperAdmin && !ehEu && (
                      confirmarRemover === m.id ? (
                        <div className="inline-flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-destructive">Excluir de vez?</span>
                          <button
                            onClick={() => removerMembro(m)}
                            disabled={removendo === m.id}
                            className="rounded-md bg-destructive px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            {removendo === m.id ? "Excluindo…" : "Sim, excluir"}
                          </button>
                          <button
                            onClick={() => { setConfirmarRemover(null); setRemoverErro(null) }}
                            disabled={removendo === m.id}
                            className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setConfirmarRemover(m.id); setRemoverErro(null) }}
                          title="Excluir membro e login"
                          className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )
                    )}
                  </div>

                  {confirmarRemover === m.id && removerErro && (
                    <div className="px-4 pb-3 -mt-1 text-[11px] font-semibold text-destructive">{removerErro}</div>
                  )}

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

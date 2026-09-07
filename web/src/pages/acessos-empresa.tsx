// Time & Permissões do CLIENTE — o dono da empresa vê quem tem acesso à conta
// dela e decide o papel e as abas de cada pessoa.
//
// Modelo (ver 20260907_permissoes_cliente_fundacao.sql e _rpcs.sql), espelhado
// do RBAC do admin em time-permissoes.tsx:
//   papel 'dono'  => is_full: vê todas as seções, sempre.
//   demais papéis => template (papel_empresa_secoes) ± override por pessoa
//                    (empresa_usuario_secao), sempre no escopo da empresa ATIVA.
//
// Toda escrita passa por RPC SECURITY DEFINER (dono_definir_papel /
// dono_definir_secao / dono_limpar_secao), nunca por UPDATE direto. O dono não
// tem policy de escrita em empresa_usuarios de propósito: convidar e excluir
// login continua sendo da PMC, pela aba /acessos. As RPCs também recusam que
// alguém mexa em si mesmo — é o que impede auto-promoção e lock-out.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ShieldCheckIcon as ShieldCheck,
  UsersIcon as Users,
  ChevronRightIcon as ChevronRight,
  CheckCircle2Icon as CheckCircle2,
  AlertCircleIcon as AlertCircle,
} from "@/components/ui/icons"

interface PapelEmpresa { chave: string; nome: string; descricao: string | null; is_full: boolean; ordem: number }
interface SecaoCliente { chave: string; label: string; grupo: string; ordem: number; sensivel: boolean }
interface Acesso {
  auth_user_id: string
  email: string | null
  nome: string | null
  papel: string
  sou_eu: boolean
  last_sign_in_at: string | null
  criado_em: string | null
  secoes_ligadas: string[]
  secoes_desligadas: string[]
}

export default function AcessosEmpresaPage() {
  const { papelEmpresa, empresas, idCliente } = useAuth()
  const [papeis, setPapeis] = useState<PapelEmpresa[]>([])
  const [secoes, setSecoes] = useState<SecaoCliente[]>([])
  const [templates, setTemplates] = useState<Record<string, Set<string>>>({})
  const [acessos, setAcessos] = useState<Acesso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)

  const ehDono = papelEmpresa === "dono"
  const empresaAtual = empresas.find((e) => e.id_cliente === idCliente)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    const [{ data: ps }, { data: sc }, { data: tpl }, { data: ac, error: acErr }] = await Promise.all([
      supabase.from("papeis_empresa").select("chave, nome, descricao, is_full, ordem").order("ordem"),
      supabase.from("secoes_cliente_catalogo").select("chave, label, grupo, ordem, sensivel").order("ordem"),
      supabase.from("papel_empresa_secoes").select("papel_chave, secao_chave"),
      supabase.rpc("get_meus_acessos_empresa"),
    ])
    if (acErr) {
      // A RPC recusa quem não é dono. Mostrar a mensagem dela é mais honesto do
      // que uma tela vazia que parece bug.
      setErro(acErr.message)
      setCarregando(false)
      return
    }
    setPapeis((ps ?? []) as PapelEmpresa[])
    setSecoes((sc ?? []) as SecaoCliente[])
    const mapa: Record<string, Set<string>> = {}
    for (const t of (tpl ?? []) as { papel_chave: string; secao_chave: string }[]) {
      (mapa[t.papel_chave] ??= new Set()).add(t.secao_chave)
    }
    setTemplates(mapa)
    setAcessos((ac ?? []) as Acesso[])
    setCarregando(false)
  }

  useEffect(() => { void carregar() }, [idCliente])

  // A mesma resolução que minhas_secoes_cliente() faz no banco. Reproduzida aqui
  // só para desenhar a tela: quem decide de verdade é a RPC e a RLS.
  function temSecao(a: Acesso, secao: string): boolean {
    const p = papeis.find((x) => x.chave === a.papel)
    if (p?.is_full) return true
    if (a.secoes_desligadas.includes(secao)) return false
    if (a.secoes_ligadas.includes(secao)) return true
    return templates[a.papel]?.has(secao) ?? false
  }

  function noTemplate(a: Acesso, secao: string): boolean {
    return templates[a.papel]?.has(secao) ?? false
  }

  async function alternarSecao(a: Acesso, secao: string) {
    const desejado = !temSecao(a, secao)
    setSalvando(`${a.auth_user_id}:${secao}`)
    // Mesmo truque do admin: se o desejado bate com o padrão do papel, apaga o
    // delta em vez de gravar. Sem isso a tabela vira um espelho do template e
    // mudar o template depois não teria efeito em ninguém.
    const { error } = desejado === noTemplate(a, secao)
      ? await supabase.rpc("dono_limpar_secao", { p_auth_user_id: a.auth_user_id, p_secao: secao })
      : await supabase.rpc("dono_definir_secao", { p_auth_user_id: a.auth_user_id, p_secao: secao, p_permitir: desejado })
    setSalvando(null)
    if (error) { toast.error(error.message); return }
    await carregar()
  }

  async function trocarPapel(a: Acesso, papel: string) {
    if (papel === a.papel) return
    setSalvando(a.auth_user_id)
    const { error } = await supabase.rpc("dono_definir_papel", { p_auth_user_id: a.auth_user_id, p_papel: papel })
    setSalvando(null)
    if (error) { toast.error(error.message); return }
    toast.success("Papel atualizado.")
    await carregar()
  }

  const grupos = useMemo(() => {
    const g: Record<string, SecaoCliente[]> = {}
    for (const s of secoes) (g[s.grupo] ??= []).push(s)
    return g
  }, [secoes])

  const fmtData = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "nunca entrou"

  if (carregando) {
    return (
      <div className="p-6">
        <PageHeader title="Time & Permissões" description="Carregando..." />
      </div>
    )
  }

  if (erro || !ehDono) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Time & Permissões" description="Quem tem acesso à conta da sua empresa." />
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              Esta área é do dono da empresa.
              {erro && <span className="block mt-1 text-xs opacity-70">{erro}</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Time & Permissões"
        description={empresaAtual?.nome_empresa
          ? `Quem tem acesso à conta da ${empresaAtual.nome_empresa} e o que cada um enxerga.`
          : "Quem tem acesso à conta da sua empresa e o que cada um enxerga."}
      />

      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <Users className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Para <strong className="text-foreground">criar ou excluir</strong> um acesso, fale com a PMC — aqui você
            define o papel e as abas de quem já tem login.
            <span className="block mt-1 text-xs opacity-80">
              As abas com <ShieldCheck className="inline size-3 text-amber-500 align-[-1px]" /> guardam informação
              sensível (números, contratos, transcrições de reunião) e ficam bloqueadas de verdade, não só escondidas.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {acessos.map((a) => {
          const aberto = expandido === a.auth_user_id
          const p = papeis.find((x) => x.chave === a.papel)
          const totalVisiveis = secoes.filter((s) => temSecao(a, s.chave)).length
          return (
            <Card key={a.auth_user_id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setExpandido(aberto ? null : a.auth_user_id)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1"
                    disabled={p?.is_full}
                    aria-expanded={aberto}
                  >
                    {!p?.is_full && (
                      <ChevronRight className={`size-4 shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`} />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {a.nome ?? a.email ?? a.auth_user_id.slice(0, 8)}
                        {a.sou_eu && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.email} · último acesso: {fmtData(a.last_sign_in_at)}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {p?.is_full ? "vê todas as abas" : `${totalVisiveis} de ${secoes.length} abas`}
                    </Badge>
                    <select
                      value={a.papel}
                      onChange={(e) => void trocarPapel(a, e.target.value)}
                      /* O dono não muda o próprio papel: seria a forma mais fácil
                         de se trancar para fora da própria empresa. A RPC recusa
                         de qualquer jeito; aqui é só para não oferecer. */
                      disabled={a.sou_eu || salvando === a.auth_user_id}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-50"
                    >
                      {papeis.map((x) => <option key={x.chave} value={x.chave}>{x.nome}</option>)}
                    </select>
                  </div>
                </div>

                {p?.is_full && (
                  <div className="text-xs text-muted-foreground pl-6">
                    O papel <strong>{p.nome}</strong> enxerga tudo — não há o que ajustar. Para restringir esta pessoa,
                    mude o papel dela primeiro.
                  </div>
                )}

                {aberto && !p?.is_full && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden pl-6 space-y-4 pt-1"
                  >
                    {Object.entries(grupos).map(([grupo, itens]) => (
                      <div key={grupo}>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          {grupo}
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                          {itens.map((s) => {
                            const on = temSecao(a, s.chave)
                            // Só marca o que REALMENTE foge do padrão do papel. Existir
                            // uma linha de override não basta: o grandfathering de
                            // 2026-09-07 gravou uma para cada aba de cada pessoa que já
                            // estava na casa, e sem esta comparação todo colaborador
                            // antigo apareceria "ajustado" em tudo — dizendo que alguém
                            // mexeu quando ninguém mexeu.
                            const alterado = on !== noTemplate(a, s.chave)
                            const trancado = s.chave === "acessos-empresa"
                            return (
                              <button
                                key={s.chave}
                                onClick={() => !trancado && void alternarSecao(a, s.chave)}
                                disabled={trancado || salvando === `${a.auth_user_id}:${s.chave}`}
                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors disabled:opacity-40 ${
                                  on ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/40"
                                }`}
                                title={trancado ? "Exclusivo do papel Dono." : undefined}
                              >
                                {on
                                  ? <CheckCircle2 className="size-4 text-primary shrink-0" />
                                  : <span className="size-4 rounded-full border border-muted-foreground/40 shrink-0" />}
                                <span className="truncate flex-1">{s.label}</span>
                                {s.sensivel && <ShieldCheck className="size-3 text-amber-500 shrink-0" />}
                                {alterado && <Badge variant="outline" className="text-[9px] px-1 py-0">ajustado</Badge>}
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

        {acessos.length === 0 && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum acesso encontrado para esta empresa.
          </CardContent></Card>
        )}
      </div>
    </div>
  )
}

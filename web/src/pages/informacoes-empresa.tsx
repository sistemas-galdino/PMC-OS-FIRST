import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Building2Icon as Building,
  SaveIcon as Save,
  Sparkles2Icon as Sparkles,
  TargetIcon as Target,
  RefreshCwIcon as RefreshCw,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/layout/page-header"

interface AnaliseIA {
  resumo?: string
  nicho?: string
  o_que_vende?: string
  proposta_valor?: string
  publico_alvo?: string
  diferenciais?: string[]
  presenca_digital?: string
  oportunidades_ia?: string[]
  markdown?: string
  fontes?: string[]
}

interface InformacoesEmpresaPageProps {
  session?: Session
  clientId?: string
}

interface InformacoesEmpresa {
  nome_negocio: string
  data_entrada: string
  data_boas_vindas: string
  site: string
  instagram: string
}

const emptyForm: InformacoesEmpresa = {
  nome_negocio: "",
  data_entrada: "",
  data_boas_vindas: "",
  site: "",
  instagram: "",
}

export default function InformacoesEmpresaPage({ session, clientId: clientIdProp }: InformacoesEmpresaPageProps) {
  const clientId = clientIdProp ?? session?.user.id ?? ""
  const [form, setForm] = useState<InformacoesEmpresa>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [analise, setAnalise] = useState<AnaliseIA | null>(null)
  const [analiseEm, setAnaliseEm] = useState<string | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [analiseErro, setAnaliseErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: info } = await supabase
        .from("cliente_informacoes_empresa")
        .select("nome_negocio, data_entrada, data_boas_vindas, site, instagram, analise_ia, analise_ia_em")
        .eq("id_cliente", clientId)
        .maybeSingle()

      const { data: entrada } = await supabase
        .from("clientes_entrada_new")
        .select("nome_empresa_formatado, nome_empresa, data")
        .eq("id_cliente", clientId)
        .maybeSingle()

      if (cancelled) return

      setForm({
        nome_negocio:
          info?.nome_negocio ??
          entrada?.nome_empresa_formatado ??
          entrada?.nome_empresa ??
          "",
        data_entrada: info?.data_entrada ?? entrada?.data ?? "",
        data_boas_vindas: info?.data_boas_vindas ?? "",
        site: info?.site ?? "",
        instagram: info?.instagram ?? "",
      })
      setAnalise((info?.analise_ia as AnaliseIA) ?? null)
      setAnaliseEm(info?.analise_ia_em ?? null)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  async function analisarNegocio(site: string, nome: string) {
    if (!site.trim()) return
    setAnalisando(true)
    setAnaliseErro(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("empresa-enriquecer", {
        body: { site, nome_negocio: nome },
      })
      if (fnErr) {
        let msg = fnErr.message
        try { const b = await (fnErr as any).context?.json(); if (b?.error) msg = b.error } catch { /* noop */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(String(data.error))
      if (!data || (!data.resumo && !(data.markdown))) {
        throw new Error("A IA não retornou uma análise. Tente novamente em alguns instantes.")
      }
      const em = new Date().toISOString()
      setAnalise(data as AnaliseIA)
      setAnaliseEm(em)
      await supabase
        .from("cliente_informacoes_empresa")
        .update({ analise_ia: data, analise_ia_em: em })
        .eq("id_cliente", clientId)
    } catch (e: any) {
      // Limpa prefixos técnicos ("AI_ERROR:", "RATE_LIMIT:" etc.) da mensagem.
      const msg = (e.message || "Não consegui analisar o negócio agora.").replace(/^[A-Z_]+:\s*/, "")
      setAnaliseErro(msg)
    } finally {
      setAnalisando(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const payload = {
        id_cliente: clientId,
        nome_negocio: form.nome_negocio.trim() || null,
        data_entrada: form.data_entrada || null,
        data_boas_vindas: form.data_boas_vindas || null,
        site: form.site.trim() || null,
        instagram: form.instagram.trim() || null,
      }
      const { error: upsertError } = await supabase
        .from("cliente_informacoes_empresa")
        .upsert(payload, { onConflict: "id_cliente" })
      if (upsertError) throw upsertError
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2400)
      // A IA visita o site e traz o que é relevante do negócio. Sem site, não roda.
      if (form.site.trim()) {
        void analisarNegocio(form.site.trim(), form.nome_negocio.trim())
      }
    } catch (err: any) {
      setError(err.message || "Erro ao salvar informações")
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof InformacoesEmpresa>(key: K, value: InformacoesEmpresa[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto w-full max-w-5xl space-y-8 pb-12"
    >
      <PageHeader
        title="Cadastro da Empresa"
        description="Informações básicas do seu negócio"
      />

      <Card className="border-border bg-card/50 backdrop-blur-xl shadow-xl overflow-visible">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
              <Building className="size-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground leading-tight">Informações de Cadastro</CardTitle>
              <CardDescription className="text-sm text-muted-foreground font-medium">Dados principais da empresa</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-6 pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl text-sm font-semibold"
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary/10 text-foreground border border-primary/20 p-4 rounded-xl text-sm font-semibold"
                  >
                    Informações salvas com sucesso!
                  </motion.div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="nome_negocio" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Nome do Negócio</Label>
                    <Input
                      id="nome_negocio"
                      type="text"
                      placeholder="Nome da empresa"
                      value={form.nome_negocio}
                      onChange={(e) => update("nome_negocio", e.target.value)}
                      className="bg-muted/10 border-border focus-visible:border-primary/50"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Data de Entrada</Label>
                    <DatePicker
                      value={form.data_entrada}
                      onChange={(v) => update("data_entrada", v)}
                      placeholder="Selecionar data"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Data Boas Vindas</Label>
                    <DatePicker
                      value={form.data_boas_vindas}
                      onChange={(v) => update("data_boas_vindas", v)}
                      placeholder="Selecionar data"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="site" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Site</Label>
                    <Input
                      id="site"
                      type="url"
                      placeholder="https://www.empresa.com"
                      value={form.site}
                      onChange={(e) => update("site", e.target.value)}
                      className="bg-muted/10 border-border focus-visible:border-primary/50"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2.5 md:col-span-2">
                    <Label htmlFor="instagram" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Instagram</Label>
                    <Input
                      id="instagram"
                      type="text"
                      placeholder="@empresa"
                      value={form.instagram}
                      onChange={(e) => update("instagram", e.target.value)}
                      className="bg-muted/10 border-border focus-visible:border-primary/50"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-11 px-6 font-bold shadow-lg shadow-primary/20"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Salvando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="size-4" />
                        Salvar Informações
                      </div>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </form>
      </Card>

      {/* Análise do negócio pela IA (site + Instagram) */}
      {(analisando || analise || analiseErro) && (
        <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                  <Sparkles className="size-6 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground leading-tight">Análise do Negócio pela IA</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground font-medium">
                    A IA visita o site da empresa e traz o que é relevante do negócio.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={analisando || !form.site.trim()}
                  className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                  onClick={() => analisarNegocio(form.site.trim(), form.nome_negocio.trim())}
                >
                  <RefreshCw className={`size-3.5 ${analisando ? "animate-spin" : ""}`} />
                  {analisando ? "Analisando..." : "Analisar de novo"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {analisando && !analise && (
              <div className="flex items-center gap-3 py-8 justify-center text-center">
                <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">
                  Visitando o site e lendo o negócio...
                </p>
              </div>
            )}

            {analiseErro && (
              <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl text-sm font-semibold">
                {analiseErro}
              </div>
            )}

            {analise && (
              <>
                {analise.resumo && (
                  <p className="text-[15px] font-semibold text-foreground leading-relaxed">{analise.resumo}</p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { label: "Nicho", value: analise.nicho },
                    { label: "O que vende", value: analise.o_que_vende },
                    { label: "Proposta de valor", value: analise.proposta_valor },
                    { label: "Público-alvo", value: analise.publico_alvo },
                  ].filter((c) => c.value).map((c) => (
                    <div key={c.label} className="rounded-xl bg-muted/20 border border-border p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{c.label}</p>
                      <p className="text-[13px] font-medium text-foreground leading-relaxed">{c.value}</p>
                    </div>
                  ))}
                </div>

                {analise.presenca_digital && (
                  <div className="rounded-xl bg-muted/20 border border-border p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Presença digital</p>
                    <p className="text-[13px] font-medium text-foreground leading-relaxed">{analise.presenca_digital}</p>
                  </div>
                )}

                {Array.isArray(analise.diferenciais) && analise.diferenciais.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Diferenciais</p>
                    <div className="flex flex-wrap gap-2">
                      {analise.diferenciais.map((d, i) => (
                        <Badge key={i} variant="outline" className="rounded-lg border-primary/20 bg-primary/5 text-foreground px-3 py-1 text-[12px] font-medium">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(analise.oportunidades_ia) && analise.oportunidades_ia.length > 0 && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-1.5">
                      <Target className="size-3.5" />
                      Oportunidades de IA para este negócio
                    </p>
                    <div className="space-y-2">
                      {analise.oportunidades_ia.map((o, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="font-mono text-[11px] font-bold text-primary mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                          <p className="text-[13px] font-medium text-foreground leading-relaxed">{o}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analise.markdown && (
                  <details className="group">
                    <summary className="cursor-pointer text-[12px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors list-none flex items-center gap-1.5">
                      <RefreshCw className="size-3.5 group-open:rotate-90 transition-transform" />
                      Ver análise completa
                    </summary>
                    <div className="mt-3 rounded-xl bg-muted/20 border border-border p-4 prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-foreground text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analise.markdown}</ReactMarkdown>
                    </div>
                  </details>
                )}

                {analiseEm && (
                  <p className="text-[11px] font-medium text-muted-foreground/70">
                    Analisado em {new Date(analiseEm).toLocaleString("pt-BR")}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

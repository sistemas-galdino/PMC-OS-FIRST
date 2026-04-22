import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Building2Icon as Building,
  SaveIcon as Save,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

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

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: info } = await supabase
        .from("cliente_informacoes_empresa")
        .select("nome_negocio, data_entrada, data_boas_vindas, site, instagram")
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
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Cadastro da Empresa</h1>
        <p className="text-sm text-muted-foreground font-medium">Informações básicas do seu negócio</p>
      </div>

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
    </motion.div>
  )
}

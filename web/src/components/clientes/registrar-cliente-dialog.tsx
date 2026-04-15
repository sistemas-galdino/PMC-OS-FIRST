import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UF_OPTIONS } from "@/components/onboarding/step-dados-responsavel"
import { NICHO_OPTIONS } from "@/components/onboarding/step-dados-negocio"
import { ComboboxInput } from "@/components/ui/combobox-input"

const STATUS_OPTIONS = [
  'Ativo no Programa',
  'Aguardando Início',
  'Pendente de Onboarding',
  'Cliente Cancelado',
  'Desistência de Compra',
]

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function titleCase(str: string) {
  return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase())
}

const currentYear = new Date().getFullYear()
const ANO_OPTIONS = [currentYear - 1, currentYear, currentYear + 1]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  scOptions: string[]
}

const INITIAL_FORM = {
  nome_cliente: '',
  nome_empresa: '',
  email: '',
  estado_uf: '',
  sc: '',
  status_atual: '',
  unidade_treinamento: '',
  produto: '',
  nicho: '',
  subnicho: '',
  canal_de_venda: '',
  mes_treinamento: '',
  ano_treinamento: '',
}

export function RegistrarClienteDialog({ open, onOpenChange, onSuccess, scOptions }: Props) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [gerarLink, setGerarLink] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [emailDebug, setEmailDebug] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const [produtoOptions, setProdutoOptions] = useState<string[]>([])
  const [canalOptions, setCanalOptions] = useState<string[]>([])
  const [unidadeOptions, setUnidadeOptions] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    supabase
      .from('clientes_entrada_new')
      .select('produto, canal_de_venda, unidade_treinamento')
      .then(({ data }) => {
        if (!data) return
        const produtos = [...new Set(data.map(d => d.produto).filter(Boolean))].sort()
        const canais = [...new Set(data.map(d => d.canal_de_venda).filter(Boolean))].sort()
        const unidades = [...new Set(data.map(d => d.unidade_treinamento).filter(Boolean))].sort()
        setProdutoOptions(produtos)
        setCanalOptions(canais)
        setUnidadeOptions(unidades)
      })
  }, [open])

  const set = (field: keyof typeof form) => (value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.nome_cliente.trim()) {
      setError('Nome do cliente é obrigatório')
      return
    }
    if (gerarLink && !form.email.trim()) {
      setError('Preencha o e-mail para gerar o link de cadastro')
      return
    }

    setError(null)
    setLoading(true)

    try {
      // 1. Insert direto na tabela (apenas quando NAO for gerar link —
      //    a edge function invite-client cria o registro inteiro quando
      //    gerarLink=true, entao inserir aqui duplicaria a linha).
      if (!gerarLink) {
        const { error: insertError } = await supabase
          .from('clientes_entrada_new')
          .insert({
            id_cliente: crypto.randomUUID(),
            nome_cliente: form.nome_cliente.trim(),
            nome_empresa: form.nome_empresa.trim() || null,
            nome_cliente_formatado: titleCase(form.nome_cliente.trim()),
            nome_empresa_formatado: form.nome_empresa.trim() ? titleCase(form.nome_empresa.trim()) : null,
            estado_uf: form.estado_uf || null,
            sc: form.sc || null,
            status_atual: form.status_atual || null,
            unidade_treinamento: form.unidade_treinamento.trim() || null,
            produto: form.produto.trim() || null,
            nicho: form.nicho || null,
            subnicho: form.subnicho.trim() || null,
            canal_de_venda: form.canal_de_venda.trim() || null,
            mes_treinamento: form.mes_treinamento || null,
            ano_treinamento: form.ano_treinamento ? parseInt(form.ano_treinamento) : null,
          })

        if (insertError) throw new Error(insertError.message)
      }

      // 2. Se gerar link, chamar edge function
      if (gerarLink && form.email.trim()) {
        const session = await supabase.auth.getSession()
        const accessToken = session.data.session?.access_token
        if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-client`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              nome: form.nome_cliente.trim(),
              nome_empresa: form.nome_empresa.trim(),
              email: form.email.trim(),
              app_url: window.location.origin,
            }),
          }
        )

        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
        setEmailSent(!!data.email_sent)
        setEmailDebug(data.email_debug ?? null)
        if (data.invite_link) setInviteLink(data.invite_link)
      }

      setSuccess(true)
      if (!inviteLink && !(gerarLink && form.email.trim())) {
        setTimeout(() => {
          resetAndClose()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar cliente')
    } finally {
      setLoading(false)
    }
  }

  const resetAndClose = () => {
    setForm(INITIAL_FORM)
    setGerarLink(false)
    setSuccess(false)
    setInviteLink(null)
    setEmailDebug(null)
    setEmailSent(false)
    setError(null)
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetAndClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-background border-l border-border">
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle className="text-lg font-bold text-foreground">Registrar Novo Cliente</SheetTitle>
          <p className="text-sm text-muted-foreground mt-1">Preencha as informações do cliente. Apenas o nome é obrigatório.</p>
        </SheetHeader>

        {success ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-3">
              <div className="size-14 bg-primary/10 border-2 border-primary/30 rounded-full flex items-center justify-center mx-auto">
                <svg className="size-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-foreground">Cliente cadastrado!</p>
              {emailSent && !inviteLink ? (
                <>
                  <p className="text-sm text-muted-foreground">Convite enviado por e-mail.</p>
                  <Button variant="outline" size="sm" onClick={resetAndClose}>Fechar</Button>
                </>
              ) : inviteLink ? (
                <>
                  {emailDebug && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 text-[11px] text-left">
                      <p className="font-bold uppercase tracking-wider mb-1">E-mail não enviado</p>
                      <p className="text-[11px] font-mono break-all">{emailDebug}</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">Copie e envie o link abaixo para o cliente:</p>
                  <div
                    className="bg-muted/20 border border-border rounded-xl p-3 text-xs text-foreground break-all text-left select-all cursor-pointer"
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                  >
                    {inviteLink}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Clique no link acima para copiar</p>
                  <Button variant="outline" size="sm" onClick={resetAndClose}>Fechar</Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">O cliente foi adicionado à lista.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl text-sm font-semibold text-center">
                  {error}
                </div>
              )}

              {/* Nome cliente (obrigatório) */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Cliente *</Label>
                <Input
                  value={form.nome_cliente}
                  onChange={(e) => set('nome_cliente')(e.target.value)}
                  placeholder="Nome completo"
                  className="h-11 rounded-xl border-border bg-background"
                />
              </div>

              {/* Nome empresa */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Empresa</Label>
                <Input
                  value={form.nome_empresa}
                  onChange={(e) => set('nome_empresa')(e.target.value)}
                  placeholder="Nome da empresa"
                  className="h-11 rounded-xl border-border bg-background"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                  placeholder="cliente@email.com"
                  className="h-11 rounded-xl border-border bg-background"
                />
              </div>

              {/* Grid 2 colunas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Estado */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</Label>
                  <Select value={form.estado_uf} onValueChange={set('estado_uf')}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_OPTIONS.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* SC */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SC</Label>
                  <Select value={form.sc} onValueChange={set('sc')}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scOptions.map(sc => (
                        <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={form.status_atual} onValueChange={set('status_atual')}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unidade */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unidade</Label>
                  <ComboboxInput
                    value={form.unidade_treinamento}
                    onChange={set('unidade_treinamento')}
                    options={unidadeOptions}
                    placeholder="Unidade de treinamento"
                  />
                </div>

                {/* Produto */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Produto</Label>
                  <ComboboxInput
                    value={form.produto}
                    onChange={set('produto')}
                    options={produtoOptions}
                    placeholder="Ex: PMC, PCE..."
                  />
                </div>

                {/* Canal de venda */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Canal de Venda</Label>
                  <ComboboxInput
                    value={form.canal_de_venda}
                    onChange={set('canal_de_venda')}
                    options={canalOptions}
                    placeholder="Ex: IA para Negócios..."
                  />
                </div>

                {/* Nicho */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nicho</Label>
                  <Select value={form.nicho} onValueChange={set('nicho')}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHO_OPTIONS.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subnicho */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subnicho</Label>
                  <Input
                    value={form.subnicho}
                    onChange={(e) => set('subnicho')(e.target.value)}
                    placeholder="Subnicho"
                    className="h-11 rounded-xl border-border bg-background"
                  />
                </div>

                {/* Mês do treinamento */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mês Treinamento</Label>
                  <Select value={form.mes_treinamento} onValueChange={set('mes_treinamento')}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                      <SelectValue placeholder="Mês..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ano do treinamento */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ano Treinamento</Label>
                  <Select value={form.ano_treinamento} onValueChange={set('ano_treinamento')}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                      <SelectValue placeholder="Ano..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ANO_OPTIONS.map(a => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Gerar link de cadastro */}
              <label className="flex items-center gap-3 bg-muted/20 rounded-xl px-4 py-3 border border-border/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gerarLink}
                  onChange={(e) => setGerarLink(e.target.checked)}
                  className="size-4 rounded border-border accent-primary"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">Gerar link de cadastro</p>
                  <p className="text-[11px] text-muted-foreground">Envia convite para o cliente preencher o formulário completo</p>
                </div>
              </label>
            </div>

            <SheetFooter className="p-6 border-t border-border">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Cadastrando...
                  </div>
                ) : 'Cadastrar Cliente'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

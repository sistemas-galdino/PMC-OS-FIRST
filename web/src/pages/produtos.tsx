import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  PackageIcon as Package,
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Edit3Icon as Edit3,
  TrendingUpIcon as TrendingUp,
  ShoppingCartIcon as ShoppingCart,
  BanknoteIcon as Banknote,
  SearchIcon as Search
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

type ClassificacaoTicket = 'low' | 'middle' | 'high'

interface Product {
  id: string
  nome: string
  preco: number
  ticket_medio: number | null
  tipo: 'Recorrente' | 'Avulso'
  vendas_mes: number
  classificacao_ticket: ClassificacaoTicket | null
}

const CLASSIFICACAO_LABELS: Record<ClassificacaoTicket, string> = {
  low: 'Low Ticket',
  middle: 'Middle Ticket',
  high: 'High Ticket',
}

interface ProdutosPageProps {
  session?: Session
  clientId?: string
}

export default function ProdutosPage({ session, clientId }: ProdutosPageProps) {
  const resolvedClientId = clientId || session?.user?.id
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showSheet, setShowSheet] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', preco: '', ticket_medio: '', tipo: 'Recorrente' as 'Recorrente' | 'Avulso', vendas_mes: '', classificacao_ticket: '' as '' | ClassificacaoTicket })

  useEffect(() => {
    if (!resolvedClientId) {
      setLoading(false)
      return
    }
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('cliente_produtos')
        .select('*')
        .eq('id_cliente', resolvedClientId)
        .order('nome', { ascending: true })

      if (data && !error) {
        setProducts(data)
      }
      setLoading(false)
    }

    fetchProducts()
  }, [resolvedClientId])

  function openNew() {
    setEditingProduct(null)
    setForm({ nome: '', preco: '', ticket_medio: '', tipo: 'Recorrente', vendas_mes: '', classificacao_ticket: '' })
    setShowSheet(true)
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setForm({
      nome: product.nome,
      preco: String(product.preco ?? ''),
      ticket_medio: product.ticket_medio != null ? String(product.ticket_medio) : '',
      tipo: product.tipo,
      vendas_mes: String(product.vendas_mes ?? ''),
      classificacao_ticket: (product.classificacao_ticket ?? '') as '' | ClassificacaoTicket,
    })
    setShowSheet(true)
  }

  async function handleDelete(product: Product) {
    await supabase.from('cliente_produtos').delete().eq('id', product.id)
    setProducts(prev => prev.filter(p => p.id !== product.id))
  }

  async function handleSave() {
    if (!resolvedClientId) return
    setSaving(true)
    const payload = {
      nome: form.nome,
      preco: Number(form.preco) || 0,
      ticket_medio: form.ticket_medio === '' ? null : Number(form.ticket_medio),
      tipo: form.tipo,
      vendas_mes: Number(form.vendas_mes) || 0,
      classificacao_ticket: form.classificacao_ticket === '' ? null : form.classificacao_ticket,
    }
    if (editingProduct) {
      const { data, error } = await supabase
        .from('cliente_produtos')
        .update(payload)
        .eq('id', editingProduct.id)
        .select()
        .single()
      if (!error && data) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? data : p))
        setShowSheet(false)
      }
    } else {
      const { data, error } = await supabase
        .from('cliente_produtos')
        .insert([{ id_cliente: resolvedClientId, ...payload }])
        .select()
        .single()
      if (!error && data) {
        setProducts(prev => [...prev, data])
        setShowSheet(false)
      }
    }
    setSaving(false)
  }

  const filteredProducts = products.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalRevenue = products.reduce((acc, p) => acc + (p.preco * p.vendas_mes), 0)
  const avgTicket = products.length ? (products.reduce((acc, p) => acc + p.preco, 0) / products.length) : 0
  const totalSales = products.reduce((acc, p) => acc + p.vendas_mes, 0)

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  }

  if (loading) {
    return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-40 animate-pulse bg-card/40" />)}
    </div>
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Catálogo de Produtos</h1>
          <p className="text-muted-foreground font-medium text-sm">Gestão de ofertas e performance de vendas mensais.</p>
        </div>
        <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10" onClick={openNew}>
          <Plus className="size-5" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Novo Produto</span>
        </Button>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { title: "Total Produtos", value: products.length, icon: Package },
          { title: "Receita Prevista", value: `R$ ${(totalRevenue / 1000).toFixed(1)}k`, icon: TrendingUp },
          { title: "Ticket Médio", value: `R$ ${avgTicket.toFixed(0)}`, icon: Banknote },
          { title: "Vendas Totais", value: totalSales, icon: ShoppingCart },
        ].map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <stat.icon className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar no catálogo..."
          className="pl-11 h-12 bg-muted/10 border-border focus-visible:border-primary/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredProducts.map((product) => (
          <motion.div key={product.id} variants={item}>
            <Card className="group overflow-hidden hover:border-primary/30 transition-all duration-300">
              <CardHeader className="bg-muted/10 pb-6 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        product.tipo === 'Recorrente'
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-muted/20 border-border text-muted-foreground'
                      }`}
                    >
                      {product.tipo}
                    </Badge>
                    {product.classificacao_ticket && (
                      <Badge
                        variant="outline"
                        className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-muted/20 border-border text-muted-foreground"
                      >
                        {CLASSIFICACAO_LABELS[product.classificacao_ticket]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-muted/50" onClick={() => openEdit(product)}>
                      <Edit3 className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(product)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-5 text-xl font-bold tracking-tight text-foreground line-clamp-2 min-h-[3.5rem]">
                  {product.nome}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                      {product.ticket_medio != null ? 'Ticket Médio' : 'Valor Unit.'}
                    </p>
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      R$ {product.ticket_medio != null ? product.ticket_medio : product.preco}
                    </p>
                  </div>
                  <div className="space-y-1.5 border-l border-border/50 pl-6">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Faturamento</p>
                    <p className="text-2xl font-bold tracking-tight text-primary">R$ {(product.preco * product.vendas_mes / 1000).toFixed(1)}k</p>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-muted/20 border border-border/50 flex justify-between items-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Volume Mensal</p>
                    <span className="text-sm font-bold text-foreground">{product.vendas_mes} Vendas</span>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <TrendingUp className="size-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Sheet open={showSheet} onOpenChange={(open) => { if (!open) setShowSheet(false) }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-lg font-bold text-foreground">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input
                className="h-11 rounded-xl"
                value={form.nome}
                onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço (R$)</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={form.preco}
                placeholder="0"
                onChange={(e) => setForm(prev => ({ ...prev, preco: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ticket Médio (R$)</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={form.ticket_medio}
                placeholder="0"
                onChange={(e) => setForm(prev => ({ ...prev, ticket_medio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classificação</Label>
              <Select
                value={form.classificacao_ticket}
                onValueChange={(v) => setForm(prev => ({ ...prev, classificacao_ticket: v as ClassificacaoTicket }))}
              >
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Ticket</SelectItem>
                  <SelectItem value="middle">Middle Ticket</SelectItem>
                  <SelectItem value="high">High Ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm(prev => ({ ...prev, tipo: v as 'Recorrente' | 'Avulso' }))}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recorrente">Recorrente</SelectItem>
                  <SelectItem value="Avulso">Avulso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vendas/Mês</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={form.vendas_mes}
                placeholder="0"
                onChange={(e) => setForm(prev => ({ ...prev, vendas_mes: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-border">
            <Button
              disabled={saving}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              onClick={handleSave}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

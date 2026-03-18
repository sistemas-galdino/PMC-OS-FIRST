import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import type { Session } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"

interface Product {
  id: string
  nome: string
  preco: number
  tipo: 'Recorrente' | 'Avulso'
  vendas_mes: number
}

export default function ProdutosPage({ session }: { session: Session }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('cliente_produtos')
        .select('*')
        .order('nome', { ascending: true })
      
      if (data && !error) {
        setProducts(data)
      } else {
        // Dummy data for Sprint 3 demo
        setProducts([
          { id: '1', nome: 'Curso CALLAN em grupo ONLINE', preco: 290, tipo: 'Recorrente', vendas_mes: 500 },
          { id: '2', nome: 'Curso CALLAN em grupo PRESENCIAL', preco: 330, tipo: 'Recorrente', vendas_mes: 500 },
          { id: '3', nome: 'Curso de idioma VIP', preco: 650, tipo: 'Recorrente', vendas_mes: 0 },
          { id: '4', nome: 'Curso de Conversação', preco: 230, tipo: 'Recorrente', vendas_mes: 0 },
          { id: '5', nome: 'MBA Kids & Teens', preco: 200, tipo: 'Recorrente', vendas_mes: 30 },
          { id: '6', nome: 'Material didático', preco: 170, tipo: 'Avulso', vendas_mes: 205 },
        ])
      }
      setLoading(false)
    }

    fetchProducts()
  }, [])

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
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
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
        <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10">
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-muted/50">
                      <Edit3 className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
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
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Valor Unit.</p>
                    <p className="text-2xl font-bold tracking-tight text-foreground">R$ {product.preco}</p>
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
    </div>
  )
}


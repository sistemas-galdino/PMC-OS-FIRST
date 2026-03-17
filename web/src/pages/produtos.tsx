import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  ShoppingCart, 
  Banknote,
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Session } from "@supabase/supabase-js"

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
        // Dummy data for Sprint 3 demo if table is empty
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

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-20 w-1/3 bg-card border-2 border-foreground" />
      <div className="grid gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card border-2 border-foreground" />)}
      </div>
    </div>
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 border-b-4 border-foreground pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase">Produtos</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Catálogo de produtos e serviços do seu negócio.</p>
        </div>
        <Button className="h-12 gap-2 bg-primary text-foreground border-2 border-foreground shadow-brutal-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1">
          <Plus className="size-5" />
          <span className="font-black uppercase tracking-widest text-xs">Adicionar Produto</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Produtos</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <Package className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{products.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Receita Mensal</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <TrendingUp className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">R$ {(totalRevenue / 1000).toFixed(1)}k</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Ticket Médio</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <Banknote className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">R$ {avgTicket.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Vendas/Mês</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <ShoppingCart className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{totalSales}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 size-5 text-foreground" />
        <Input
          placeholder="Buscar produtos..."
          className="pl-10 h-12 rounded-none border-2 border-foreground shadow-brutal-sm focus-visible:shadow-none focus-visible:translate-y-[2px] focus-visible:translate-x-[2px] transition-all bg-card font-bold uppercase"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="bg-card group overflow-hidden border-2 border-foreground shadow-brutal hover:shadow-[6px_6px_0px_0px_var(--color-foreground)] transition-all">
            <CardHeader className="border-b-2 border-foreground bg-muted/10">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className={`rounded-none border-2 font-black text-[9px] uppercase tracking-widest ${product.tipo === 'Recorrente' ? 'bg-primary border-foreground' : 'bg-background border-foreground'}`}>
                  {product.tipo}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-8 border-2 border-transparent hover:border-foreground hover:bg-background">
                    <Edit3 className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 border-2 border-transparent hover:border-destructive hover:bg-destructive hover:text-white">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-4 text-xl font-black leading-tight uppercase tracking-tight min-h-[3rem] line-clamp-2">
                {product.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ticket Médio</p>
                  <p className="text-2xl font-black tracking-tighter">R$ {product.preco}</p>
                </div>
                <div className="space-y-1 border-l-2 border-foreground/10 pl-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Receita Mensal</p>
                  <p className="text-2xl font-black tracking-tighter text-primary">R$ {(product.preco * product.vendas_mes / 1000).toFixed(1)}k</p>
                </div>
              </div>
              
              <div className="mt-6 p-3 bg-muted/20 border-2 border-foreground/10 flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-widest">{product.vendas_mes} vendas/mês</span>
                <TrendingUp className="size-4 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

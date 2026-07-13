// HUB PMC — mapa do Brasil (por estado) e do mundo (por país) mostrando onde
// há PMCs e a quantidade de clientes. Dados vêm da RPC agregada hub_pmc_distribuicao
// (só contagens, sem PII). Carregado sob demanda (lazy) por causa do topojson.
import { useEffect, useMemo, useState } from "react"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GlobeIcon as Globe, MapPinIcon as MapPin, UsersIcon as Users } from "@/components/ui/icons"
import { motion } from "framer-motion"
import brasil from "@/data/maps/brazil-states.json"
import mundo from "@/data/maps/world-countries.json"

interface EstadoDist { uf: string; total: number }
interface PaisDist { pais: string; total: number }
interface Distribuicao { total: number; estados: EstadoDist[]; paises: PaisDist[] }

// ISO-2 (coluna `pais`) → código numérico ISO-3166 usado pelo world-atlas.
const ISO2_NUM: Record<string, string> = {
  BR: "076", US: "840", PT: "620", AR: "032", MX: "484", CL: "152",
  CO: "170", ES: "724", PY: "600", UY: "858", AO: "024", MZ: "508",
}
const PAIS_NOME: Record<string, string> = {
  BR: "Brasil", US: "Estados Unidos", PT: "Portugal", AR: "Argentina",
  MX: "México", CL: "Chile", CO: "Colômbia", ES: "Espanha",
  PY: "Paraguai", UY: "Uruguai", AO: "Angola", MZ: "Moçambique",
}

const UF_NOME: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
}

// escala de verde por intensidade (0..1) sobre fundo escuro
function corPorIntensidade(t: number): string {
  if (t <= 0) return "var(--color-muted)"
  // interpola opacidade do primary
  return `color-mix(in oklab, var(--color-primary) ${Math.round(25 + t * 75)}%, var(--color-muted))`
}

export default function HubPmc() {
  const [dist, setDist] = useState<Distribuicao | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.rpc("hub_pmc_distribuicao").then(({ data }) => {
      if (cancelled) return
      setDist((data as Distribuicao) ?? { total: 0, estados: [], paises: [] })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const porUF = useMemo(() => {
    const m: Record<string, number> = {}
    dist?.estados.forEach((e) => { m[e.uf] = e.total })
    return m
  }, [dist])

  const porPaisNum = useMemo(() => {
    const m: Record<string, number> = {}
    dist?.paises.forEach((p) => { const num = ISO2_NUM[p.pais]; if (num) m[num] = p.total })
    return m
  }, [dist])

  const maxUF = useMemo(() => Math.max(1, ...Object.values(porUF)), [porUF])
  const maxPais = useMemo(() => Math.max(1, ...Object.values(porPaisNum)), [porPaisNum])

  const totalBR = dist?.estados.reduce((a, e) => a + e.total, 0) ?? 0
  const nEstados = dist?.estados.length ?? 0
  const nPaises = dist?.paises.length ?? 0

  if (loading) {
    return <div className="h-[520px] rounded-2xl bg-card/40 animate-pulse" />
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 lg:p-8 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
              <Globe className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">HUB PMC</h2>
              <p className="text-sm font-medium text-muted-foreground">
                Onde o Multiplicador de Crescimento já está — no Brasil e no mundo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight text-primary">{dist?.total ?? 0}</p>
              <p className="text-[11px] font-medium text-muted-foreground">Clientes PMC</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight text-foreground">{nEstados}</p>
              <p className="text-[11px] font-medium text-muted-foreground">Estados</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight text-foreground">{nPaises}</p>
              <p className="text-[11px] font-medium text-muted-foreground">Países</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Mapa do Brasil */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" />
              Brasil — {totalBR} cliente{totalBR !== 1 ? "s" : ""}
            </p>
            <div className="relative rounded-2xl bg-muted/10 border border-border/50 overflow-hidden">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 620, center: [-54, -15] }}
                width={420}
                height={420}
                style={{ width: "100%", height: "auto" }}
              >
                <Geographies geography={brasil as any}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const uf = (geo.properties?.sigla || geo.id) as string
                      const total = porUF[uf] || 0
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() => setHover(uf)}
                          onMouseLeave={() => setHover(null)}
                          style={{
                            default: { fill: corPorIntensidade(total / maxUF), stroke: "var(--color-background)", strokeWidth: 0.5, outline: "none" },
                            hover: { fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: 0.75, outline: "none", cursor: "pointer" },
                            pressed: { fill: "var(--color-primary)", outline: "none" },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ComposableMap>
              {hover && UF_NOME[hover] && (
                <div className="absolute top-3 left-3 rounded-lg bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5">
                  <p className="text-[12px] font-bold text-foreground">{UF_NOME[hover]}</p>
                  <p className="text-[11px] font-medium text-primary">{porUF[hover] || 0} cliente(s)</p>
                </div>
              )}
            </div>
          </div>

          {/* Mapa do mundo */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Globe className="size-3.5 text-primary" />
              Mundo — {nPaises} paí{nPaises === 1 ? "s" : "ses"}
            </p>
            <div className="rounded-2xl bg-muted/10 border border-border/50 overflow-hidden">
              <ComposableMap
                projection="geoEqualEarth"
                projectionConfig={{ scale: 150 }}
                width={480}
                height={300}
                style={{ width: "100%", height: "auto" }}
              >
                <Geographies geography={mundo as any}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const total = porPaisNum[String(geo.id)] || 0
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: { fill: corPorIntensidade(total / maxPais), stroke: "var(--color-background)", strokeWidth: 0.4, outline: "none" },
                            hover: { fill: total > 0 ? "var(--color-primary)" : "var(--color-muted)", outline: "none" },
                            pressed: { outline: "none" },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>
            {/* Ranking de países */}
            <div className="flex flex-wrap gap-2">
              {(dist?.paises ?? []).slice(0, 6).map((p) => (
                <Badge key={p.pais} variant="outline" className="rounded-lg border-border text-foreground px-2.5 py-1 text-[11px] font-bold gap-1.5">
                  <Users className="size-3 text-primary" />
                  {PAIS_NOME[p.pais] ?? p.pais}: {p.total}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Ranking de estados */}
        {nEstados > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Top estados</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(dist?.estados ?? []).slice(0, 6).map((e) => (
                <motion.div
                  key={e.uf}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">{e.uf}</span>
                    <span className="text-[13px] font-medium text-foreground truncate">{UF_NOME[e.uf] ?? e.uf}</span>
                  </div>
                  <span className="text-[13px] font-bold text-foreground shrink-0">{e.total}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

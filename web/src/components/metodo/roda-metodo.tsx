import { FASES_METODO } from "@/data/metodo-mc"
import { motion } from "framer-motion"

interface RodaMetodoProps {
  faseAtiva: number
  onSelect: (numero: number) => void
  concluidas?: Set<number>
}

// Converte ângulo polar (graus, 0 = topo, sentido horário) em coordenada cartesiana.
function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

// Path SVG de um segmento de rosca entre dois ângulos.
function donutSlice(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, rOuter, a0)
  const [x1, y1] = polar(cx, cy, rOuter, a1)
  const [x2, y2] = polar(cx, cy, rInner, a1)
  const [x3, y3] = polar(cx, cy, rInner, a0)
  const large = a1 - a0 > 180 ? 1 : 0
  return [
    `M ${x0} ${y0}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3}`,
    "Z",
  ].join(" ")
}

// Quebra o título em até 2 linhas (para caber na fatia sem reticências).
function wrapTitulo(titulo: string, max = 13): string[] {
  const palavras = titulo.split(" ")
  const linhas: string[] = []
  let atual = ""
  for (const p of palavras) {
    const tentativa = (atual + " " + p).trim()
    if (tentativa.length > max && atual) {
      linhas.push(atual)
      atual = p
    } else {
      atual = tentativa
    }
  }
  if (atual) linhas.push(atual)
  if (linhas.length <= 2) return linhas
  // Junta o excedente na 2ª linha para nunca passar de 2 linhas.
  return [linhas[0], linhas.slice(1).join(" ")]
}

const SIZE = 420
const CX = SIZE / 2
const CY = SIZE / 2
const R_OUTER = 190
const R_INNER = 118
const GAP = 4 // graus de respiro entre fatias

export function RodaMetodo({ faseAtiva, onSelect, concluidas }: RodaMetodoProps) {
  const n = FASES_METODO.length
  const passo = 360 / n

  return (
    <div className="relative w-full max-w-[420px] mx-auto select-none">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto">
        {/* anel pontilhado externo com sensação de ciclo */}
        <circle
          cx={CX} cy={CY} r={R_OUTER + 12}
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="3 7"
          strokeWidth="1.5"
          opacity={0.7}
        />
        {FASES_METODO.map((fase, i) => {
          const a0 = i * passo + GAP / 2
          const a1 = (i + 1) * passo - GAP / 2
          const mid = (a0 + a1) / 2
          const ativa = fase.numero === faseAtiva
          const done = concluidas?.has(fase.numero) ?? false
          const [nx, ny] = polar(CX, CY, (R_OUTER + R_INNER) / 2, mid)
          return (
            <motion.g
              key={fase.numero}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              onClick={() => onSelect(fase.numero)}
              className="cursor-pointer"
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            >
              <path
                d={donutSlice(CX, CY, ativa ? R_OUTER + 6 : R_OUTER, R_INNER, a0, a1)}
                fill={ativa ? "var(--color-primary)" : done ? "var(--color-primary)" : "var(--color-muted)"}
                opacity={ativa ? 1 : done ? 0.35 : 0.25}
                className="transition-all duration-300 hover:opacity-60"
              />
              {(() => {
                const linhas = wrapTitulo(fase.titulo)
                const duas = linhas.length > 1
                const corTitulo = ativa ? "fill-primary-foreground" : "fill-foreground"
                return (
                  <>
                    <text
                      x={nx}
                      y={ny - (duas ? 13 : 8)}
                      textAnchor="middle"
                      className={`font-mono font-bold ${ativa ? "fill-primary-foreground" : "fill-foreground"}`}
                      fontSize="19"
                    >
                      {String(fase.numero).padStart(2, "0")}
                    </text>
                    {linhas.map((ln, li) => (
                      <text
                        key={li}
                        x={nx}
                        y={ny + 7 + li * 13}
                        textAnchor="middle"
                        className={corTitulo}
                        opacity={ativa ? 1 : 0.92}
                        fontSize="11"
                        fontWeight="700"
                      >
                        {ln}
                      </text>
                    ))}
                  </>
                )
              })()}
            </motion.g>
          )
        })}
        {/* centro */}
        <text x={CX} y={CY - 20} textAnchor="middle" className="fill-muted-foreground" fontSize="11" fontWeight="700" letterSpacing="2.5">
          MÉTODO
        </text>
        <text x={CX} y={CY + 4} textAnchor="middle" className="fill-foreground" fontSize="21" fontWeight="800">
          MULTIPLICADOR
        </text>
        <text x={CX} y={CY + 28} textAnchor="middle" className="fill-primary" fontSize="21" fontWeight="800">
          DE CRESCIMENTO
        </text>
      </svg>
    </div>
  )
}

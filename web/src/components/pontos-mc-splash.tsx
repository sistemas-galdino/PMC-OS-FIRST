// Splash de Pontos MC — celebração visual quando o cliente ganha pontos.
// Como os Pontos MC são calculados (não guardados), não existe "evento de ganho"
// no banco: quem sabe do ganho é a tela onde ele aconteceu. Qualquer página chama
// celebrarPontosMC(25, "Mapeamento · Produtos preenchido") e este componente
// (montado uma vez no DashboardLayout) mostra a explosão: partículas Neon Lime,
// "+25" gigante e o motivo. Variante especial para subida de nível.
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

interface SplashEvent {
  pontos: number
  motivo?: string
  nivelNovo?: string   // presente => variante level-up
}

const EVENT_NAME = "pontos-mc"
const DURACAO_MS = 2600

/** Dispara o splash de pontos de qualquer lugar do app (só telas do cliente). */
export function celebrarPontosMC(pontos: number, motivo?: string, nivelNovo?: string) {
  if (pontos <= 0) return
  window.dispatchEvent(new CustomEvent<SplashEvent>(EVENT_NAME, { detail: { pontos, motivo, nivelNovo } }))
}

// ── Som de conquista (sintetizado, sem asset) ──────────────────────────────
// Arpejo de dó maior (dó-mi-sol) para pontos; versão com oitava + pad para o
// level-up. Toca só após gesto do usuário (salvar/login) — senão fica em
// silêncio. Respeita prefers-reduced-motion e o flag localStorage 'pmc:som-mudo'.
let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioCtx) { try { audioCtx = new AC() } catch { return null } }
  return audioCtx
}

function nota(ctx: AudioContext, freq: number, inicio: number, dur: number, pico: number, tipo: OscillatorType = "triangle") {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = tipo
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, inicio)
  g.gain.linearRampToValueAtTime(pico, inicio + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(inicio)
  osc.stop(inicio + dur + 0.05)
}

function tocarConquista(levelUp: boolean) {
  if (typeof window === "undefined") return
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
  try { if (localStorage.getItem("pmc:som-mudo") === "1") return } catch { /* ignore */ }
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  const t = ctx.currentTime + 0.02
  const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5
  const seq = levelUp ? [C5, E5, G5, C6] : [C5, E5, G5]
  const passo = levelUp ? 0.1 : 0.08
  seq.forEach((f, i) => nota(ctx, f, t + i * passo, levelUp ? 0.5 : 0.32, 0.16))
  if (levelUp) {
    // pad final (oitava + quinta) para dar peso ao level-up
    const fim = t + seq.length * passo
    nota(ctx, C6, fim, 0.9, 0.1, "sine")
    nota(ctx, G5, fim, 0.9, 0.07, "sine")
  }
}

interface Particula {
  x: number; y: number; rot: number; escala: number; cor: string; atraso: number
}

function gerarParticulas(qtd: number): Particula[] {
  const cores = ["bg-primary", "bg-primary", "bg-primary/70", "bg-amber-400", "bg-white"]
  return Array.from({ length: qtd }, (_, i) => {
    const ang = (i / qtd) * Math.PI * 2 + Math.random() * 0.6
    const dist = 90 + Math.random() * 130
    return {
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist - 30,
      rot: (Math.random() - 0.5) * 540,
      escala: 0.5 + Math.random() * 0.9,
      cor: cores[Math.floor(Math.random() * cores.length)],
      atraso: Math.random() * 0.12,
    }
  })
}

export function PontosMCSplash() {
  const [atual, setAtual] = useState<(SplashEvent & { key: number; particulas: Particula[] }) | null>(null)
  const fila = useRef<SplashEvent[]>([])
  const contador = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduzMotion = useRef(false)

  useEffect(() => {
    reduzMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

    function mostrarProximo() {
      const prox = fila.current.shift()
      if (!prox) { setAtual(null); return }
      contador.current += 1
      setAtual({ ...prox, key: contador.current, particulas: reduzMotion.current ? [] : gerarParticulas(18) })
      tocarConquista(Boolean(prox.nivelNovo))
      timer.current = setTimeout(mostrarProximo, DURACAO_MS)
    }

    function onEvento(e: Event) {
      const det = (e as CustomEvent<SplashEvent>).detail
      if (!det || det.pontos <= 0) return
      fila.current.push(det)
      if (!timer.current) mostrarProximo()
      // se timer existe, o próximo da fila entra quando o atual terminar
    }

    window.addEventListener(EVENT_NAME, onEvento)
    return () => {
      window.removeEventListener(EVENT_NAME, onEvento)
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  // Quando a fila esvazia o timeout precisa se encerrar de verdade.
  useEffect(() => {
    if (atual === null && timer.current) { clearTimeout(timer.current); timer.current = null }
  }, [atual])

  return (
    <AnimatePresence>
      {atual && (
        <motion.div
          key={atual.key}
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          aria-live="polite"
        >
          {/* Glow radial */}
          <motion.div
            className="absolute size-[420px] rounded-full bg-primary/15 blur-3xl"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
          />

          {/* Partículas */}
          {atual.particulas.map((p, i) => (
            <motion.span
              key={i}
              className={`absolute size-2.5 rounded-[3px] ${p.cor}`}
              initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
              animate={{ x: p.x, y: p.y, scale: p.escala, rotate: p.rot, opacity: 0 }}
              transition={{ duration: 1.3, delay: p.atraso, ease: [0.12, 0.8, 0.3, 1] }}
            />
          ))}

          {/* Cartão central */}
          <motion.div
            className="relative flex flex-col items-center gap-1 px-10 py-8 rounded-3xl bg-background/85 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/20"
            initial={{ scale: 0.6, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            {atual.nivelNovo ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-muted-foreground">Subiu de nível</p>
                <p className="text-4xl lg:text-5xl font-bold tracking-tight text-primary leading-none my-1">{atual.nivelNovo}</p>
                <p className="text-[13px] font-semibold text-foreground">+{atual.pontos} <span className="text-muted-foreground font-medium">Pontos MC</span></p>
              </>
            ) : (
              <>
                <motion.p
                  className="text-6xl lg:text-7xl font-bold tracking-tight text-primary leading-none tabular-nums"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [0.5, 1.15, 1] }}
                  transition={{ duration: 0.55, times: [0, 0.7, 1] }}
                >
                  +{atual.pontos}
                </motion.p>
                <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-muted-foreground mt-2">Pontos MC</p>
              </>
            )}
            {atual.motivo && (
              <p className="text-[12px] font-medium text-muted-foreground mt-1.5 max-w-[260px] text-center">{atual.motivo}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

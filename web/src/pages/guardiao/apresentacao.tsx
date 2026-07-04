import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { useStore } from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react"

type Slide = { id: string; render: () => ReactNode }

export default function Apresentacao() {
  const [searchParams] = useSearchParams()
  const projetoParam = searchParams.get("projeto") ?? undefined
  const setorParam = searchParams.get("setor") ?? undefined

  const navigate = useNavigate()
  const setores = useStore((s) => s.setores)
  const projetos = useStore((s) => s.projetos)
  const gargalos = useStore((s) => s.gargalos)
  const tarefas = useStore((s) => s.tarefas)
  const resumo = useStore((s) => s.resumo)

  const [i, setI] = useState(0)

  const slides: Slide[] = useMemo(() => {
    const all: Slide[] = []

    // Filtro opcional
    const projetoFiltro = projetoParam ? projetos.find((p) => p.id === projetoParam) : null
    const setorFiltro = setorParam ? setores.find((s) => s.id === setorParam) : null

    const projetosAtivos = projetoFiltro
      ? [projetoFiltro]
      : projetos.filter((p) => !["Concluído"].includes(p.status))
          .filter((p) => !setorFiltro || p.setorId === setorFiltro.id)

    const titulo = projetoFiltro
      ? `Projeto: ${projetoFiltro.nome}`
      : setorFiltro
        ? `Setor: ${setorFiltro.nome}`
        : "Operação do Guardião de IA"

    // Capa
    all.push({
      id: "capa",
      render: () => (
        <div className="h-full flex flex-col justify-between p-16">
          <div className="flex items-center gap-4">
            <LogoMark className="h-16 w-16 text-xl" />
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-primary">Multiplicador de Crescimento</div>
              <div className="text-sm text-muted-foreground">Sistema Operacional do Guardião de IA</div>
            </div>
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.3em] text-primary mb-4">Apresentação para o CEO</div>
            <h1 className="text-7xl font-semibold tracking-tight leading-[1.05]">{titulo}</h1>
            <p className="mt-6 text-2xl text-muted-foreground max-w-3xl">
              Transforme gargalos em rotinas, automações e sistemas.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
      ),
    })

    // Panorama (só no modo geral)
    if (!projetoFiltro) {
      const setoresView = setorFiltro ? [setorFiltro] : setores
      const gargalosView = gargalos.filter((g) => !setorFiltro || g.setorId === setorFiltro.id)
      const projetosView = projetos.filter((p) => !setorFiltro || p.setorId === setorFiltro.id)
      const horas = projetosView.reduce((a, p) => a + (p.horasEconomizadas || 0), 0)
      const implantados = projetosView.filter((p) => ["Implementado", "Medindo resultados", "Apresentado ao CEO", "Apresentado ao time"].includes(p.status)).length

      all.push({
        id: "panorama",
        render: () => (
          <div className="h-full flex flex-col p-16">
            <div className="text-sm uppercase tracking-[0.3em] text-primary mb-2">Panorama</div>
            <h2 className="text-5xl font-semibold mb-10">Onde estamos hoje</h2>
            <div className="grid grid-cols-3 gap-6 flex-1">
              <BigStat n={setoresView.length} label="Setores ativos" />
              <BigStat n={gargalosView.length} label="Gargalos mapeados" />
              <BigStat n={projetosView.length} label="Projetos pilotos" />
              <BigStat n={implantados} label="Implantados" />
              <BigStat n={`${horas}h`} label="Economizadas / semana" />
              <BigStat n={tarefas.filter((t) => t.status !== "Concluído").length} label="Tarefas em aberto" />
            </div>
          </div>
        ),
      })
    }

    // Um slide por projeto ativo
    projetosAtivos.slice(0, 8).forEach((p) => {
      const setor = setores.find((s) => s.id === p.setorId)
      const gargalo = gargalos.find((g) => g.id === p.gargaloId)
      const progresso = Math.round((p.tarefasPadrao.filter((t) => t.done).length / Math.max(1, p.tarefasPadrao.length)) * 100)
      all.push({
        id: "proj-" + p.id,
        render: () => (
          <div className="h-full p-16 flex flex-col">
            <div className="text-sm uppercase tracking-[0.3em] text-primary mb-2">{setor?.nome ?? "Projeto Piloto"}</div>
            <h2 className="text-5xl font-semibold mb-2 leading-tight">{p.nome}</h2>
            <div className="text-xl text-muted-foreground mb-8">Status: <span className="text-foreground">{p.status}</span> · {p.tipoEntrega}</div>

            <div className="grid grid-cols-3 gap-6 flex-1">
              <SlideCard label="Antes" tone="warn">
                <p className="text-xl leading-snug">{p.problema || gargalo?.descricao || "—"}</p>
              </SlideCard>
              <SlideCard label="Solução" tone="neon">
                <p className="text-xl leading-snug">{p.solucao || "—"}</p>
              </SlideCard>
              <SlideCard label="Depois" tone="ok">
                <p className="text-xl leading-snug">{p.resultadoEsperado || "—"}</p>
                {p.resultadoAlcancado && <p className="mt-3 text-base text-muted-foreground">Alcançado: {p.resultadoAlcancado}</p>}
              </SlideCard>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-6">
              <MiniStat n={`${progresso}%`} label="Progresso" />
              <MiniStat n={`${p.horasEconomizadas}h`} label="Economizadas/sem" />
              <MiniStat n={p.prazo || "—"} label="Prazo" />
            </div>
          </div>
        ),
      })
    })

    // Decisões CEO
    const decisoes = tarefas.filter((t) => t.status !== "Concluído" && t.prioridade === "Alta")
    if (!projetoFiltro && (resumo.apoioCEO || decisoes.length > 0)) {
      all.push({
        id: "decisoes",
        render: () => (
          <div className="h-full p-16 flex flex-col">
            <div className="text-sm uppercase tracking-[0.3em] text-primary mb-2">Decisões pendentes</div>
            <h2 className="text-5xl font-semibold mb-8">O que precisamos do CEO</h2>
            {resumo.apoioCEO && (
              <div className="rounded-lg border border-primary/40 bg-card p-6 mb-4">
                <div className="text-sm uppercase tracking-wider text-primary mb-1">Esta semana</div>
                <div className="text-2xl">{resumo.apoioCEO}</div>
              </div>
            )}
            <div className="space-y-3 overflow-auto">
              {decisoes.slice(0, 5).map((t) => (
                <div key={t.id} className="rounded-lg border bg-card p-4 flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">!</div>
                  <div>
                    <div className="text-xl">{t.titulo}</div>
                    <div className="text-sm text-muted-foreground">{t.tipo} · {t.responsavel || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      })
    }

    // Encerramento
    all.push({
      id: "fim",
      render: () => (
        <div className="h-full flex flex-col items-center justify-center p-16 text-center">
          <LogoMark className="h-24 w-24 text-3xl mb-8" />
          <div className="text-sm uppercase tracking-[0.3em] text-primary mb-4">Multiplicador de Crescimento</div>
          <h2 className="text-6xl font-semibold mb-6">Obrigado.</h2>
          <p className="text-2xl text-muted-foreground max-w-2xl">Não ter mais planilhas. Toda planilha deve se transformar em sistema.</p>
        </div>
      ),
    })

    return all
  }, [setores, projetos, gargalos, tarefas, resumo, projetoParam, setorParam])

  useEffect(() => { setI(0) }, [projetoParam, setorParam])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        setI((x) => Math.min(slides.length - 1, x + 1))
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setI((x) => Math.max(0, x - 1))
      } else if (e.key === "Escape") {
        navigate("/guardiao")
      } else if (e.key.toLowerCase() === "f") {
        document.documentElement.requestFullscreen?.()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [slides.length, navigate])

  const slide = slides[i]

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col">
      {/* topbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => document.documentElement.requestFullscreen?.()}>
          <Maximize2 /> Tela cheia (F)
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/guardiao"><X /> Sair (Esc)</Link>
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex items-stretch justify-center">
        <div key={slide?.id} className="w-full max-w-[1400px] m-auto h-[80vh] rounded-lg border bg-card overflow-hidden relative animate-fade">
          {slide?.render()}
        </div>
      </div>

      {/* footer nav */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-card/60 backdrop-blur">
        <Button variant="outline" size="sm" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
          <ChevronLeft /> Anterior
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">{i + 1} / {slides.length}</div>
          <div className="flex gap-1">
            {slides.map((s, k) => (
              <button
                key={s.id}
                onClick={() => setI(k)}
                className={"h-1.5 rounded-full transition-all " + (k === i ? "w-8 bg-primary" : "w-2 bg-muted")}
              />
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setI((x) => Math.min(slides.length - 1, x + 1))} disabled={i === slides.length - 1}>
          Próximo <ChevronRight />
        </Button>
      </div>

      <style>{`
        .animate-fade { animation: fade .25s ease-out; }
        @keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

// Placeholder do logo PMC — o asset .jpeg do Lovable não existe no app alvo.
function LogoMark({ className }: { className?: string }) {
  return (
    <div className={"rounded-2xl bg-primary text-primary-foreground grid place-items-center font-bold tracking-tight " + (className ?? "")}>
      PMC
    </div>
  )
}

function BigStat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-8 flex flex-col justify-center">
      <div className="text-7xl font-semibold text-primary tracking-tight">{n}</div>
      <div className="text-lg text-muted-foreground mt-2">{label}</div>
    </div>
  )
}

function MiniStat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="text-3xl font-semibold text-primary">{n}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function SlideCard({ label, tone, children }: { label: string; tone: "warn" | "neon" | "ok"; children: ReactNode }) {
  const tones = {
    warn: "border-amber-500/40 bg-amber-500/5",
    neon: "border-primary/40 bg-primary/5",
    ok: "border-emerald-500/40 bg-emerald-500/5",
  }
  return (
    <div className={"rounded-2xl border p-6 flex flex-col " + tones[tone]}>
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// Página editorial de um case da vitrine (/vitrine/case/:caseId).
//
// A ORDEM DOS BLOCOS foi validada com a usuária no sistema original e não deve
// ser reordenada: hero → resumo → como era antes → gargalos → como ficou depois
// → "O que o PMC ajudou a transformar" (clímax da narrativa comercial) →
// principais ganhos → evidências.
//
// Regras editoriais inegociáveis:
//   - "Nicho do cliente" (setor da empresa) ≠ "Área impactada" (área do negócio
//     transformada). Os dois aparecem, nunca fundidos.
//   - PENDENTE_VALIDACAO nunca vai pra tela: todo texto passa por exibivel/
//     listaExibivel. Bloco sem conteúdo simplesmente não é renderizado — nada de
//     "não informado".
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { LogoCliente } from "@/components/vitrine/logo-cliente"
import {
  ArrowLeftIcon as ArrowLeft,
  ChevronRightIcon as ChevronRight,
  ExternalLinkIcon as ExternalLink,
  Sparkles2Icon as Sparkles,
  CheckCircle2Icon as CheckCircle2,
  AlertCircleIcon as AlertCircle,
  TrendingUpIcon as TrendingUp,
  CompassIcon as Compass,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import {
  exibivel,
  listaExibivel,
  nomeEmpresa,
  ordenarVitrine,
  type ShowcaseCase,
  type VitrineEvidencia,
} from "@/lib/vitrine"

const BUCKET_EVIDENCIAS = "vitrine-evidencias"

type EvidenciaExibicao = VitrineEvidencia & { src: string | null }

export default function VitrineCasePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const [cases, setCases] = useState<ShowcaseCase[]>([])
  const [loading, setLoading] = useState(true)
  const [evidencias, setEvidencias] = useState<EvidenciaExibicao[]>([])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setLoading(true)
      const { data, error } = await supabase.from("vitrine_showcase").select("*")
      if (!ativo) return
      if (error) {
        toast.error("Não foi possível carregar o case.")
        setCases([])
      } else {
        setCases(ordenarVitrine((data ?? []) as ShowcaseCase[]))
      }
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const indice = useMemo(
    () => (caseId ? cases.findIndex((c) => c.case_id === caseId) : -1),
    [cases, caseId]
  )
  const c = indice >= 0 ? cases[indice] : null
  const anterior = indice > 0 ? cases[indice - 1] : null
  const proximo = indice >= 0 && indice < cases.length - 1 ? cases[indice + 1] : null

  // Evidências: bucket privado, então cada arquivo vira URL assinada de 1h.
  useEffect(() => {
    let ativo = true
    const vitrineCaseId = c?.vitrine_case_id
    if (!vitrineCaseId) {
      setEvidencias([])
      return
    }
    async function carregarEvidencias() {
      const { data, error } = await supabase
        .from("vitrine_evidencias")
        .select("*")
        .eq("vitrine_case_id", vitrineCaseId!)
        .eq("aprovada", true)
        .order("principal", { ascending: false })
      if (!ativo) return
      if (error || !data) {
        setEvidencias([])
        return
      }
      const linhas = data as VitrineEvidencia[]
      const resolvidas = await Promise.all(
        linhas.map(async (e) => {
          if (!e.arquivo_path) return { ...e, src: null }
          const { data: assinada } = await supabase.storage
            .from(BUCKET_EVIDENCIAS)
            .createSignedUrl(e.arquivo_path, 3600)
          return { ...e, src: assinada?.signedUrl ?? null }
        })
      )
      if (ativo) setEvidencias(resolvidas)
    }
    carregarEvidencias()
    return () => {
      ativo = false
    }
  }, [c?.vitrine_case_id])

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!c) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-24 text-center">
          <Compass className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-bold text-foreground">Case não encontrado</p>
          <p className="max-w-md text-[12px] font-medium leading-relaxed text-muted-foreground">
            Este case pode ter saído da vitrine ou o link está desatualizado.
          </p>
          <Button asChild className="mt-2 h-11 gap-2 rounded-xl text-[11px] font-bold uppercase tracking-wider">
            <Link to="/vitrine">
              <ArrowLeft className="size-4" />
              Voltar para a vitrine
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const nicho = exibivel(c.nicho)
  const subnicho = exibivel(c.subnicho)
  const area = exibivel(c.categoria)
  const pessoa = exibivel(c.cliente_nome)
  const ferramenta = exibivel(c.ferramenta_card)
  const headline = exibivel(c.headline_vitrine) || exibivel(c.headline_impacto)
  const resumo = exibivel(c.resumo_executivo)
  const antes = exibivel(c.como_era_antes)
  const gargalos = listaExibivel(c.principais_gargalos)
  const depois = exibivel(c.como_ficou_depois)
  const solucao = exibivel(c.solucao_criada)
  const processo = exibivel(c.processo_atual)
  const resultado = exibivel(c.resultado_principal)
  const transformou = exibivel(c.o_que_pmc_transformou)
  const ganhos = listaExibivel(c.principais_ganhos)
  const evidenciasVisiveis = evidencias.filter((e) => e.src || exibivel(e.url_externa))

  return (
    <div className="space-y-8 pb-10">
      {/* Navegação de topo */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-10 gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Link to="/vitrine">
            <ArrowLeft className="size-4" />
            Voltar para a vitrine
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            asChild={Boolean(anterior)}
            variant="outline"
            disabled={!anterior}
            className="h-10 gap-1.5 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider"
          >
            {anterior ? (
              <Link to={`/vitrine/case/${encodeURIComponent(anterior.case_id)}`}>
                <ArrowLeft className="size-3.5" />
                Anterior
              </Link>
            ) : (
              <span>
                <ArrowLeft className="size-3.5" />
                Anterior
              </span>
            )}
          </Button>
          <Button
            asChild={Boolean(proximo)}
            variant="outline"
            disabled={!proximo}
            className="h-10 gap-1.5 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider"
          >
            {proximo ? (
              <Link to={`/vitrine/case/${encodeURIComponent(proximo.case_id)}`}>
                Próximo
                <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              <span>
                Próximo
                <ChevronRight className="size-3.5" />
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 1. HERO */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative flex h-52 items-center justify-center overflow-hidden bg-muted/30 md:h-72">
          {c.capa_url ? (
            <img src={c.capa_url} alt={headline ?? c.empresa_nome} className="size-full object-cover" />
          ) : (
            <LogoCliente
              empresa={c.empresa_nome}
              logoPath={c.logo_path}
              logoDisplayPath={c.logo_display_path}
              className="size-40"
              classeIniciais="text-5xl"
            />
          )}
        </div>
        <div className="space-y-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {nicho && (
              <Badge className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                {nicho}
              </Badge>
            )}
            {area && (
              <Badge variant="outline" className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                Área impactada: {area}
              </Badge>
            )}
            {c.foco_ia && (
              <Badge
                variant="outline"
                className="gap-1 rounded-lg border-primary/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary"
              >
                <Sparkles className="size-3" />
                Inteligência artificial
              </Badge>
            )}
            {ferramenta && (
              <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                {ferramenta}
              </Badge>
            )}
          </div>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-4xl">
            {headline ?? nomeEmpresa(c.empresa_nome)}
          </h1>
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {nomeEmpresa(c.empresa_nome)}
            {pessoa && <span className="font-medium normal-case tracking-normal"> — {pessoa}</span>}
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Conteúdo editorial */}
        <div className="space-y-6">
          {/* 3. Resumo executivo */}
          {resumo && <BlocoTexto titulo="Resumo executivo" texto={resumo} destaqueLeve />}

          {/* 4. Como era antes */}
          {antes && <BlocoTexto titulo="Como era antes" texto={antes} />}

          {/* 5. Principais gargalos */}
          {gargalos.length > 0 && (
            <Bloco titulo="Principais gargalos">
              <ul className="space-y-2.5">
                {gargalos.map((g, i) => (
                  <li key={i} className="flex gap-2.5 text-[14px] font-medium leading-relaxed text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive/70" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          {/* 6. Como ficou depois (+ solução, processo e resultado) */}
          {(depois || solucao || processo || resultado) && (
            <Bloco titulo="Como ficou depois">
              <div className="space-y-5">
                {depois && (
                  <p className="whitespace-pre-line text-[14px] font-medium leading-relaxed text-muted-foreground">
                    {depois}
                  </p>
                )}
                {solucao && <SubBloco titulo="O que foi criado" texto={solucao} />}
                {processo && <SubBloco titulo="Como o processo roda hoje" texto={processo} />}
                {resultado && <SubBloco titulo="Resultado principal" texto={resultado} />}
              </div>
            </Bloco>
          )}

          {/* 7. CLÍMAX — bloco mais importante da narrativa comercial */}
          {transformou && (
            <section className="relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-primary/[0.07] p-7 shadow-lg shadow-primary/10 md:p-9">
              <span className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden />
              <div className="space-y-4 pl-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                    O que o PMC ajudou a transformar
                  </h2>
                </div>
                <p className="whitespace-pre-line text-lg font-semibold leading-relaxed text-foreground md:text-xl">
                  {transformou}
                </p>
              </div>
            </section>
          )}

          {/* 8. Principais ganhos */}
          {ganhos.length > 0 && (
            <Bloco titulo="Principais ganhos">
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {ganhos.map((g, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 rounded-xl border border-border bg-muted/10 p-3 text-[13px] font-medium leading-relaxed text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          {/* 9. Evidências */}
          {evidenciasVisiveis.length > 0 && (
            <Bloco titulo="Evidências">
              <div className="grid gap-4 sm:grid-cols-2">
                {evidenciasVisiveis.map((e) => {
                  const legenda = exibivel(e.legenda)
                  const externa = exibivel(e.url_externa)
                  return (
                    <figure key={e.id} className="overflow-hidden rounded-xl border border-border bg-muted/10">
                      {e.src ? (
                        <img
                          src={e.src}
                          alt={legenda ?? "Evidência do case"}
                          loading="lazy"
                          className="max-h-64 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center bg-muted/20">
                          <ExternalLink className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <figcaption className="space-y-2 p-3">
                        {legenda && (
                          <p className="text-[12px] font-medium leading-relaxed text-muted-foreground">{legenda}</p>
                        )}
                        {externa && (
                          <a
                            href={externa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                          >
                            <ExternalLink className="size-3.5" />
                            Abrir evidência
                          </a>
                        )}
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            </Bloco>
          )}
        </div>

        {/* 2. Sobre este case — sidebar sticky no desktop */}
        <aside className="lg:sticky lg:top-6">
          <Card className="rounded-2xl">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <LogoCliente
                  empresa={c.empresa_nome}
                  logoPath={c.logo_path}
                  logoDisplayPath={c.logo_display_path}
                  className="size-12 shrink-0"
                  classeIniciais="text-sm"
                />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Sobre este case
                </h2>
              </div>
              <Separator />
              <dl className="space-y-3.5">
                {pessoa && <Linha rotulo="Cliente" valor={pessoa} />}
                <Linha rotulo="Empresa" valor={nomeEmpresa(c.empresa_nome)} negrito />
                {nicho && <Linha rotulo="Nicho" valor={subnicho ? `${nicho} · ${subnicho}` : nicho} />}
                {area && <Linha rotulo="Área impactada" valor={area} />}
                <Linha rotulo="Uso de IA" valor={c.foco_ia ? "Sim" : "Não"} />
                {ferramenta && <Linha rotulo="Ferramenta" valor={ferramenta} />}
              </dl>
              {resultado && (
                <>
                  <Separator />
                  <div className="flex gap-2.5">
                    <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-[12px] font-medium leading-relaxed text-foreground">{resultado}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:p-7">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  )
}

function BlocoTexto({ titulo, texto, destaqueLeve }: { titulo: string; texto: string; destaqueLeve?: boolean }) {
  return (
    <Bloco titulo={titulo}>
      <p
        className={cn(
          "whitespace-pre-line font-medium leading-relaxed",
          destaqueLeve ? "text-[15px] text-foreground" : "text-[14px] text-muted-foreground"
        )}
      >
        {texto}
      </p>
    </Bloco>
  )
}

function SubBloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{titulo}</h3>
      <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed text-foreground">{texto}</p>
    </div>
  )
}

function Linha({ rotulo, valor, negrito }: { rotulo: string; valor: string; negrito?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{rotulo}</dt>
      <dd className={cn("text-[13px] leading-snug text-foreground", negrito ? "font-bold tracking-wide" : "font-medium")}>
        {valor}
      </dd>
    </div>
  )
}

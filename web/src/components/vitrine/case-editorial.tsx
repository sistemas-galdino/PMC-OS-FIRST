// Corpo editorial de um case da vitrine — hero + os 6 blocos + a ficha lateral.
//
// Vive aqui, e não dentro da página, porque DUAS telas mostram o mesmo case: a
// página do admin (/vitrine/case/:caseId) e o modo apresentação
// (/vitrine/apresentar/:caseId). A ORDEM DOS BLOCOS é regra editorial validada
// com a usuária — se ela ficasse duplicada, as duas telas divergiriam na
// primeira mudança.
//
// Ordem (não reordenar): hero → resumo executivo → como era antes → principais
// gargalos → como ficou depois → "O que o PMC ajudou a transformar" (o clímax
// da narrativa comercial) → principais ganhos → evidências.
//
// A prop `escala` mexe SÓ em tipografia e espaçamento. Nunca em quais blocos
// aparecem nem em que ordem.
//
// Regras editoriais inegociáveis:
//   - "Nicho do cliente" (setor da empresa) ≠ "Área impactada" (área do negócio
//     transformada). Os dois aparecem, nunca fundidos.
//   - PENDENTE_VALIDACAO nunca vai pra tela: todo texto passa por exibivel/
//     listaExibivel. Bloco sem conteúdo não é renderizado — nada de "não
//     informado".
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { LogoCliente } from "@/components/vitrine/logo-cliente"
import {
  ExternalLinkIcon as ExternalLink,
  Sparkles2Icon as Sparkles,
  CheckCircle2Icon as CheckCircle2,
  AlertCircleIcon as AlertCircle,
  TrendingUpIcon as TrendingUp,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import {
  exibivel,
  listaExibivel,
  nomeEmpresa,
  type ShowcaseCase,
  type VitrineEvidencia,
} from "@/lib/vitrine"

const BUCKET_EVIDENCIAS = "vitrine-evidencias"

export type EvidenciaExibicao = VitrineEvidencia & { src: string | null }

export type EscalaCase = "normal" | "apresentacao"

/**
 * Evidências aprovadas de um case. O bucket é PRIVADO, então cada arquivo vira
 * uma URL assinada de 1h — nunca URL pública.
 */
export function useEvidenciasCase(vitrineCaseId: string | undefined): EvidenciaExibicao[] {
  const [evidencias, setEvidencias] = useState<EvidenciaExibicao[]>([])

  useEffect(() => {
    let ativo = true
    if (!vitrineCaseId) {
      setEvidencias([])
      return
    }
    async function carregar() {
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
      const resolvidas = await Promise.all(
        (data as VitrineEvidencia[]).map(async (e) => {
          if (!e.arquivo_path) return { ...e, src: null }
          const { data: assinada } = await supabase.storage
            .from(BUCKET_EVIDENCIAS)
            .createSignedUrl(e.arquivo_path, 3600)
          return { ...e, src: assinada?.signedUrl ?? null }
        })
      )
      if (ativo) setEvidencias(resolvidas)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [vitrineCaseId])

  return evidencias
}

// Tudo que muda entre a tela do admin e a apresentação projetada num telão.
const ESCALAS = {
  normal: {
    hero: "h-52 md:h-72",
    logoHero: "size-40",
    logoHeroTexto: "text-5xl",
    heroPad: "p-6 md:p-8",
    h1: "text-3xl lg:text-4xl",
    grid: "gap-8 lg:grid-cols-[1fr_320px]",
    coluna: "space-y-6",
    blocoPad: "p-6 md:p-7",
    corpo: "text-[14px]",
    corpoDestaque: "text-[15px]",
    climax: "p-7 md:p-9",
    climaxTexto: "text-lg md:text-xl",
    item: "text-[13px]",
  },
  apresentacao: {
    hero: "h-64 md:h-[22rem]",
    logoHero: "size-52",
    logoHeroTexto: "text-6xl",
    heroPad: "p-8 md:p-10",
    h1: "text-4xl lg:text-5xl",
    grid: "gap-10 lg:grid-cols-[1fr_360px]",
    coluna: "space-y-8",
    blocoPad: "p-8 md:p-9",
    corpo: "text-[16px]",
    corpoDestaque: "text-[18px]",
    climax: "p-9 md:p-12",
    climaxTexto: "text-xl md:text-2xl",
    item: "text-[15px]",
  },
} as const

type Props = {
  c: ShowcaseCase
  evidencias: EvidenciaExibicao[]
  escala?: EscalaCase
}

export function CaseEditorial({ c, evidencias, escala = "normal" }: Props) {
  const e = ESCALAS[escala]

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
  const evidenciasVisiveis = evidencias.filter((ev) => ev.src || exibivel(ev.url_externa))

  return (
    <div className={escala === "apresentacao" ? "space-y-10" : "space-y-8"}>
      {/* 1. HERO */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className={cn("relative flex items-center justify-center overflow-hidden bg-muted/30", e.hero)}>
          {c.capa_url ? (
            <img src={c.capa_url} alt={headline ?? c.empresa_nome} className="size-full object-cover" />
          ) : (
            <LogoCliente
              empresa={c.empresa_nome}
              logoPath={c.logo_path}
              logoDisplayPath={c.logo_display_path}
              className={e.logoHero}
              classeIniciais={e.logoHeroTexto}
            />
          )}
        </div>
        <div className={cn("space-y-4", e.heroPad)}>
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
          <h1 className={cn("max-w-4xl font-bold leading-tight tracking-tight text-foreground", e.h1)}>
            {headline ?? nomeEmpresa(c.empresa_nome)}
          </h1>
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {nomeEmpresa(c.empresa_nome)}
            {pessoa && <span className="font-medium normal-case tracking-normal"> — {pessoa}</span>}
          </p>
        </div>
      </section>

      <div className={cn("grid lg:items-start", e.grid)}>
        {/* Conteúdo editorial */}
        <div className={e.coluna}>
          {/* 3. Resumo executivo */}
          {resumo && <BlocoTexto e={e} titulo="Resumo executivo" texto={resumo} destaqueLeve />}

          {/* 4. Como era antes */}
          {antes && <BlocoTexto e={e} titulo="Como era antes" texto={antes} />}

          {/* 5. Principais gargalos */}
          {gargalos.length > 0 && (
            <Bloco e={e} titulo="Principais gargalos">
              <ul className="space-y-2.5">
                {gargalos.map((g, i) => (
                  <li
                    key={i}
                    className={cn("flex gap-2.5 font-medium leading-relaxed text-muted-foreground", e.corpo)}
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive/70" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          {/* 6. Como ficou depois (+ solução, processo e resultado) */}
          {(depois || solucao || processo || resultado) && (
            <Bloco e={e} titulo="Como ficou depois">
              <div className="space-y-5">
                {depois && (
                  <p className={cn("whitespace-pre-line font-medium leading-relaxed text-muted-foreground", e.corpo)}>
                    {depois}
                  </p>
                )}
                {solucao && <SubBloco e={e} titulo="O que foi criado" texto={solucao} />}
                {processo && <SubBloco e={e} titulo="Como o processo roda hoje" texto={processo} />}
                {resultado && <SubBloco e={e} titulo="Resultado principal" texto={resultado} />}
              </div>
            </Bloco>
          )}

          {/* 7. CLÍMAX — bloco mais importante da narrativa comercial */}
          {transformou && (
            <section
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-primary/[0.07] shadow-lg shadow-primary/10",
                e.climax
              )}
            >
              <span className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden />
              <div className="space-y-4 pl-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                    O que o PMC ajudou a transformar
                  </h2>
                </div>
                <p className={cn("whitespace-pre-line font-semibold leading-relaxed text-foreground", e.climaxTexto)}>
                  {transformou}
                </p>
              </div>
            </section>
          )}

          {/* 8. Principais ganhos */}
          {ganhos.length > 0 && (
            <Bloco e={e} titulo="Principais ganhos">
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {ganhos.map((g, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex gap-2.5 rounded-xl border border-border bg-muted/10 p-3 font-medium leading-relaxed text-foreground",
                      e.item
                    )}
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
            <Bloco e={e} titulo="Evidências">
              <div className="grid gap-4 sm:grid-cols-2">
                {evidenciasVisiveis.map((ev) => {
                  const legenda = exibivel(ev.legenda)
                  const externa = exibivel(ev.url_externa)
                  return (
                    <figure key={ev.id} className="overflow-hidden rounded-xl border border-border bg-muted/10">
                      {ev.src ? (
                        <img
                          src={ev.src}
                          alt={legenda ?? "Evidência do case"}
                          loading="lazy"
                          className={cn("w-full object-cover", escala === "apresentacao" ? "max-h-80" : "max-h-64")}
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

type Escala = (typeof ESCALAS)[EscalaCase]

function Bloco({ e, titulo, children }: { e: Escala; titulo: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", e.blocoPad)}>
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  )
}

function BlocoTexto({
  e,
  titulo,
  texto,
  destaqueLeve,
}: {
  e: Escala
  titulo: string
  texto: string
  destaqueLeve?: boolean
}) {
  return (
    <Bloco e={e} titulo={titulo}>
      <p
        className={cn(
          "whitespace-pre-line font-medium leading-relaxed",
          destaqueLeve ? cn(e.corpoDestaque, "text-foreground") : cn(e.corpo, "text-muted-foreground")
        )}
      >
        {texto}
      </p>
    </Bloco>
  )
}

function SubBloco({ e, titulo, texto }: { e: Escala; titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{titulo}</h3>
      <p className={cn("whitespace-pre-line font-medium leading-relaxed text-foreground", e.item)}>{texto}</p>
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

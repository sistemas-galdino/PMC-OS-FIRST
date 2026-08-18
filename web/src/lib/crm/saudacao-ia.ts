import { useEffect, useRef, useState } from "react"
import { gerarSaudacaoIA, type ContextoSaudacao } from "./ia"

/**
 * A saudação do "Meu Dia", escrita pela IA quando dá — e pelo banco de frases
 * de `saudacoes.ts` quando não dá.
 *
 * Três cuidados que o original não tinha:
 *
 * 1. **A tela nunca espera.** O cabeçalho já abre com a frase determinística;
 *    a da IA entra depois, se vier. Saudação é enfeite: não pode segurar o
 *    "Meu Dia" nem piscar vazio.
 * 2. **Uma chamada por pessoa, por dia, por período.** No original era uma
 *    chamada a cada render do cabeçalho. Aqui o resultado fica no localStorage
 *    com chave nome+data+período, e as chaves de outros dias são varridas.
 * 3. **Falha é silenciosa.** Sem chave de IA configurada, ou com o provedor
 *    fora, a pessoa continua vendo a frase local — sem toast de erro por causa
 *    de uma frase de bom dia.
 */

const PREFIXO = "pmc_crm_saudacao:"

export type Periodo = "manha" | "tarde" | "noite"

export function periodoDe(d: Date): Periodo {
  const h = d.getHours()
  return h < 12 ? "manha" : h < 18 ? "tarde" : "noite"
}

function chave(nome: string, agora: Date): string {
  const dia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(
    agora.getDate(),
  ).padStart(2, "0")}`
  return `${PREFIXO}${nome.toLowerCase()}:${dia}:${periodoDe(agora)}`
}

/** Remove saudações de dias/períodos que já passaram. */
function limpar(atual: string) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIXO) && k !== atual) localStorage.removeItem(k)
    }
  } catch {
    /* localStorage indisponível (modo privado): sem cache, e tudo bem */
  }
}

export interface DadosSaudacao {
  atrasadas: number
  hoje: number
  andamento: number
  impedidas: number
  concluidasHoje: number
  reunioes: number
  proximaReuniao?: string
}

/**
 * Devolve a frase da IA, ou `null` enquanto não houver uma. Quem chama decide
 * o fallback — normalmente a frase de `saudacaoDoDia`.
 *
 * `ativo` deixa de fora os casos em que a saudação não se aplica (navegando
 * para outro dia, nome ainda não resolvido).
 */
export function useSaudacaoIA(
  nome: string,
  agora: Date,
  dados: DadosSaudacao,
  ativo: boolean,
): string | null {
  const [texto, setTexto] = useState<string | null>(null)
  const k = nome && ativo ? chave(nome, agora) : ""

  // `dados` é recriado a cada render; o efeito depende da chave (nome+dia+
  // período), não dos números, senão cada mudança de contador dispararia uma
  // nova chamada de IA. O ref carrega os números mais recentes sem virar
  // dependência.
  const dadosRef = useRef(dados)
  dadosRef.current = dados

  useEffect(() => {
    if (!k) {
      setTexto(null)
      return
    }
    let vivo = true
    let cacheado: string | null = null
    try {
      cacheado = localStorage.getItem(k)
    } catch {
      /* sem localStorage: segue sem cache */
    }
    if (cacheado) {
      setTexto(cacheado)
      return
    }
    limpar(k)

    const d = new Date()
    const ctx: ContextoSaudacao = {
      primeiro: nome,
      diaSemana: d.toLocaleDateString("pt-BR", { weekday: "long" }),
      dataExtenso: d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }),
      periodo: periodoDe(d),
      ...dadosRef.current,
    }

    gerarSaudacaoIA(ctx)
      .then(({ texto }) => {
        if (!vivo || !texto) return
        setTexto(texto)
        try {
          localStorage.setItem(k, texto)
        } catch {
          /* cache é otimização, não requisito */
        }
      })
      .catch(() => {
        // Silêncio proposital: quem chama já tem a frase local na tela.
      })

    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, nome])

  return texto
}

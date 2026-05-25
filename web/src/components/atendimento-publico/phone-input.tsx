import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PaisDDI {
  value: string     // chave única (ISO)
  bandeira: string  // emoji
  nome: string
  ddi: string       // "+55"
  mascara?: string  // "(99) 99999-9999"
}

export const DDI_OPCOES: PaisDDI[] = [
  { value: "BR", bandeira: "🇧🇷", nome: "Brasil",         ddi: "+55",  mascara: "(99) 99999-9999" },
  { value: "US", bandeira: "🇺🇸", nome: "Estados Unidos", ddi: "+1",   mascara: "(999) 999-9999" },
  { value: "PT", bandeira: "🇵🇹", nome: "Portugal",       ddi: "+351", mascara: "999 999 999" },
  { value: "AR", bandeira: "🇦🇷", nome: "Argentina",      ddi: "+54" },
  { value: "ES", bandeira: "🇪🇸", nome: "Espanha",        ddi: "+34",  mascara: "999 999 999" },
  { value: "MX", bandeira: "🇲🇽", nome: "México",         ddi: "+52",  mascara: "99 9999 9999" },
  { value: "IT", bandeira: "🇮🇹", nome: "Itália",         ddi: "+39" },
  { value: "CL", bandeira: "🇨🇱", nome: "Chile",          ddi: "+56" },
]

const DEFAULT = DDI_OPCOES[0]

function aplicarMascara(digitos: string, mascara: string): string {
  let out = ""
  let i = 0
  for (const ch of mascara) {
    if (i >= digitos.length) break
    if (ch === "9") {
      out += digitos[i]
      i++
    } else {
      out += ch
    }
  }
  return out
}

function soDigitos(s: string): string {
  return s.replace(/\D/g, "")
}

// Tenta dividir uma string já salva ("+55 (11) 99999-1234") em ddi + número.
function parseInicial(value: string): { pais: PaisDDI; numero: string } {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return { pais: DEFAULT, numero: "" }

  // Match contra DDIs conhecidos do maior pro menor (evita +1 capturar +55, etc.)
  const ordenados = [...DDI_OPCOES].sort((a, b) => b.ddi.length - a.ddi.length)
  for (const p of ordenados) {
    if (trimmed.startsWith(p.ddi)) {
      const resto = trimmed.slice(p.ddi.length).trim()
      return { pais: p, numero: resto }
    }
  }
  // Sem DDI reconhecido — assume BR e usa tudo como número
  return { pais: DEFAULT, numero: trimmed }
}

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function PhoneInput({ value, onChange, placeholder = "Número", className }: Props) {
  const [pais, setPais] = useState<PaisDDI>(() => parseInicial(value).pais)
  const [numero, setNumero] = useState<string>(() => parseInicial(value).numero)

  // Sincroniza quando o value muda externamente (ex: reset do form)
  useEffect(() => {
    const parsed = parseInicial(value)
    setPais(parsed.pais)
    setNumero(parsed.numero)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function emitir(novoPais: PaisDDI, novoNumero: string) {
    const trimmed = novoNumero.trim()
    onChange(trimmed ? `${novoPais.ddi} ${trimmed}` : "")
  }

  function trocarPais(v: string) {
    const novo = DDI_OPCOES.find(p => p.value === v) ?? DEFAULT
    setPais(novo)
    // Reformata o número com a máscara nova (se houver)
    const digitos = soDigitos(numero)
    const reformatado = novo.mascara ? aplicarMascara(digitos, novo.mascara) : digitos
    setNumero(reformatado)
    emitir(novo, reformatado)
  }

  function trocarNumero(raw: string) {
    const digitos = soDigitos(raw)
    const formatado = pais.mascara ? aplicarMascara(digitos, pais.mascara) : digitos
    setNumero(formatado)
    emitir(pais, formatado)
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Select value={pais.value} onValueChange={trocarPais}>
        <SelectTrigger className="!h-12 w-[105px] shrink-0">
          <SelectValue>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-base leading-none">{pais.bandeira}</span>
              <span className="text-xs font-semibold text-foreground">{pais.ddi}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DDI_OPCOES.map(p => (
            <SelectItem key={p.value} value={p.value}>
              <span className="inline-flex items-center gap-2">
                <span className="text-base leading-none">{p.bandeira}</span>
                <span className="text-xs font-semibold">{p.nome}</span>
                <span className="text-xs text-muted-foreground">{p.ddi}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="numeric"
        value={numero}
        onChange={e => trocarNumero(e.target.value)}
        placeholder={pais.mascara ?? placeholder}
        className="h-12 flex-1"
      />
    </div>
  )
}

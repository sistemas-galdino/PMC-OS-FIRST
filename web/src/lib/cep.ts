import { unmask } from "@/lib/masks"

interface EnderecoViaCep {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoViaCep | null> {
  const digits = unmask(cep)
  if (digits.length !== 8) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal })
    if (!res.ok) return null
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      localidade: data.localidade ?? '',
      uf: data.uf ?? '',
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

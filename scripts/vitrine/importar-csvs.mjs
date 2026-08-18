// Importa os dois CSVs que nunca chegaram a ser gravados no banco do sistema
// antigo (as tabelas capture_tasks e future_victories vieram vazias no backup):
//   CAPTURA_PRINTS_POR_CS.csv     → vitrine_capturas    (onde está a prova do case)
//   POSSIVEIS_VITORIAS_FUTURAS.csv → vitrine_oportunidades (ainda não é case)
//
// Mesma autenticação de scripts/vitrine/importar.mjs: admin logado, sem service role.
//
// Uso:
//   node scripts/vitrine/importar-csvs.mjs --env=dev --email=... --senha=...
//   ... --dry-run

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(__dirname, '../..')
const ORIGEM = '/Users/davidabn/cases-pmc/vitrine-cases-clientes-pmc'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  })
)
const DRY = Boolean(args['dry-run'])
const AMBIENTE = args.env === 'prod' ? 'prod' : 'dev'

const env = Object.fromEntries(
  readFileSync(join(RAIZ, AMBIENTE === 'prod' ? 'web/.env.local' : 'web/.env.development.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const URL_BASE = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY

// SECRET_KEY (service role) ignora RLS e é o padrão dos outros scripts Node do
// repo. Quando ela não está no .env, cai no login de admin via GoTrue — que
// também passa nas políticas is_admin(). Nunca logar essa chave.
const SERVICE = env.SECRET_KEY || null
const APIKEY = SERVICE || ANON

const SENTINELA = new Set(['PENDENTE_VALIDACAO', 'N/A', 'NA', ''])
const limpo = (v) => {
  if (v == null) return null
  const s = String(v).trim()
  return SENTINELA.has(s) ? null : s
}
const data = (v) => (limpo(v) && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null)

/** CSV com aspas duplas e "" como escape. */
function lerCsv(caminho) {
  const texto = readFileSync(caminho, 'utf8')
  const linhas = []
  let campo = '', linha = [], dentro = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (dentro) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++ } else dentro = false
      } else campo += c
    } else if (c === '"') dentro = true
    else if (c === ',') { linha.push(campo); campo = '' }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = '' }
    else if (c !== '\r') campo += c
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
  const [cab, ...resto] = linhas.filter((l) => l.some((c) => c !== ''))
  return resto.map((l) => Object.fromEntries(cab.map((h, i) => [h, l[i] ?? ''])))
}

async function entrar() {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: args.email, password: args.senha }),
  })
  if (!r.ok) throw new Error(`login falhou: ${r.status} ${await r.text()}`)
  return (await r.json()).access_token
}

async function main() {
  const capturas = lerCsv(`${ORIGEM}/CAPTURA_PRINTS_POR_CS.csv`)
  const futuras = lerCsv(`${ORIGEM}/POSSIVEIS_VITORIAS_FUTURAS.csv`)
  console.log(`\n[${AMBIENTE}] CSV: ${capturas.length} capturas, ${futuras.length} oportunidades`)

  if (DRY) { console.log('--dry-run: nada foi escrito.'); return }

  const token = SERVICE || (await entrar())
  const cab = { apikey: APIKEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const get = async (p) => {
    const r = await fetch(`${URL_BASE}/rest/v1/${p}`, { headers: cab })
    if (!r.ok) throw new Error(`GET ${p}: ${r.status} ${await r.text()}`)
    return r.json()
  }

  const cases = await get('vitrine_cases?select=id,case_id&limit=1000')
  const idPorCase = new Map(cases.map((c) => [c.case_id, c.id]))
  const clientes = await get('vitrine_clientes?select=id,id_cliente,empresa_nome,origem_legado_uuid&limit=1000')
  const cliPorOrigem = new Map(clientes.map((c) => [c.origem_legado_uuid, c]))

  // ---- capturas ----
  // O CSV usa o esquema ANTIGO de case_id (VIT-DIV-01), da primeira base de 34
  // vitórias; o acervo atual usa VIT-001..VIT-188. Então o vínculo é feito por
  // cliente + semelhança de headline:
  //   - cliente com 1 case só  → certo, sem ambiguidade
  //   - semelhança >= 0.65     → confiante
  //   - resto                  → vincula no melhor candidato MAS marca a dúvida
  //     em observacoes, pra CS conferir (nunca some com a informação, e nunca
  //     finge certeza — 'dados_a_ocultar' no case errado seria pior que o aviso)
  const casesCompletos = await get('vitrine_cases?select=id,case_id,vitrine_cliente_id,headline_impacto&limit=1000')
  const casesPorCliente = new Map()
  for (const c of casesCompletos) {
    if (!casesPorCliente.has(c.vitrine_cliente_id)) casesPorCliente.set(c.vitrine_cliente_id, [])
    casesPorCliente.get(c.vitrine_cliente_id).push(c)
  }
  const cliPorLegado = new Map(clientes.map((c) => [c.origem_legado_uuid, c]))

  const tokens = (s) => new Set(
    String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 3)
  )
  const semelhanca = (a, b) => {
    const [x, y] = [tokens(a), tokens(b)]
    if (!x.size || !y.size) return 0
    let comuns = 0
    for (const t of x) if (y.has(t)) comuns++
    return comuns / Math.max(x.size, y.size)
  }

  let semCase = 0
  const incertas = []
  const linhasCapturas = capturas.flatMap((r) => {
    const cli = cliPorLegado.get(r.cliente_id)
    const cands = cli ? casesPorCliente.get(cli.id) ?? [] : []
    if (!cands.length) { semCase++; return [] }
    let alvo = cands[0], melhor = 0
    for (const c of cands) {
      const s = semelhanca(r.headline_impacto, c.headline_impacto)
      if (s > melhor) { melhor = s; alvo = c }
    }
    const confiante = cands.length === 1 || melhor >= 0.65
    if (!confiante) incertas.push(`${r.case_id} (${r.nome_empresa}) → ${alvo.case_id}`)
    const aviso = confiante
      ? null
      : `⚠ Vínculo automático incerto: veio do case ${r.case_id} do sistema antigo. Conferir se é mesmo este case.`
    return [{
      vitrine_case_id: alvo.id,
      cs_responsavel: limpo(r.cs_responsavel),
      reuniao_mencionada: limpo(r.nome_reuniao),
      mentor_consultor: limpo(r.consultor_ou_mentor),
      gravacao_url: limpo(r.link_video_reuniao),
      o_que_capturar: limpo(r.print_que_deve_ser_capturado) || limpo(r.o_que_procurar_no_video),
      minuto_exato: limpo(r.timestamp_possivel_demonstracao) || limpo(r.timestamp_fala_vitoria),
      trecho_para_localizar: limpo(r.trecho_fala_vitoria),
      dados_a_ocultar: limpo(r.dados_que_devem_ser_ocultados),
      legenda_sugerida: limpo(r.legenda_sugerida),
      status: 'pendente',
      observacoes: [limpo(r.observacoes), aviso].filter(Boolean).join(' — ') || null,
    }]
  })

  // ---- oportunidades ----
  // O `cliente_id` do CSV também é o clientes_entrada_new.id_cliente. Quando o
  // cliente não está na base da vitrine (ainda não tem case), a oportunidade
  // entra sem vitrine_cliente_id — não faz sentido criar cliente de vitrine
  // sem case só pra pendurar uma oportunidade.
  let semVitrine = 0
  const linhasFuturas = futuras.map((r) => {
    const cli = cliPorOrigem.get(r.cliente_id)
    if (!cli) semVitrine++
    return {
      vitrine_cliente_id: cli?.id ?? null,
      id_cliente: cli?.id_cliente ?? (limpo(r.cliente_id) || null),
      empresa_nome: cli?.empresa_nome ?? limpo(r.nome_empresa),
      descricao_projeto: limpo(r.descricao_projeto),
      status_atual: limpo(r.status_atual),
      resultado_esperado: limpo(r.resultado_esperado),
      reuniao_nome: limpo(r.nome_reuniao),
      reuniao_data: data(r.data_reuniao),
      gravacao_url: limpo(r.link_video_reuniao),
      proxima_validacao: limpo(r.proxima_validacao),
      cs_responsavel: limpo(r.cs_responsavel),
      observacoes: limpo(r.pendencias),
      origem_legado_uuid: limpo(r.case_id), // FUT-KOU-01 etc — dá idempotência
    }
  })

  for (const [tabela, onConflict, linhas] of [
    ['vitrine_capturas', null, linhasCapturas],
    ['vitrine_oportunidades', 'origem_legado_uuid', linhasFuturas],
  ]) {
    if (!linhas.length) { console.log(`  ${tabela}: nada a importar`); continue }
    const url = `${URL_BASE}/rest/v1/${tabela}${onConflict ? `?on_conflict=${onConflict}` : ''}`
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...cab, Prefer: `${onConflict ? 'resolution=merge-duplicates,' : ''}return=minimal` },
      body: JSON.stringify(linhas),
    })
    if (!r.ok) throw new Error(`${tabela}: ${r.status} ${await r.text()}`)
    console.log(`  ${tabela}: ${linhas.length} ✓`)
  }
  if (semCase) console.log(`  ${semCase} capturas ignoradas (cliente sem case no acervo)`)
  if (semVitrine) console.log(`  ${semVitrine} oportunidades sem cliente na vitrine (gravadas só com id_cliente)`)
  if (incertas.length) {
    console.log(`  ${incertas.length} capturas com vínculo INCERTO (marcadas em observacoes p/ a CS conferir):`)
    incertas.forEach((i) => console.log(`    ${i}`))
  }

  // Confere no banco em vez de confiar no retorno do POST.
  for (const t of ['vitrine_capturas', 'vitrine_oportunidades']) {
    const r = await fetch(`${URL_BASE}/rest/v1/${t}?select=*`, {
      headers: { ...cab, Prefer: 'count=exact', Range: '0-0' },
    })
    console.log(`  ${t}: ${r.headers.get('content-range')?.split('/')[1]} linhas no banco`)
  }
}

main().catch((e) => { console.error('\nERRO:', e.message); process.exit(1) })

// Backfill: vitórias JÁ aprovadas no Repositório que ficaram fora da vitrine.
//
// A automação "vitória aprovada vira case" só dispara quando alguém MUDA o
// status no kanban — quem já estava aprovado antes do deploy nunca passou pelo
// gatilho. Este script fecha essa lacuna: cria o case e manda a IA escrever os
// blocos editoriais, exatamente como a tela faria.
//
// AUTENTICAÇÃO — o oposto dos outros scripts do repo, e de propósito:
// aqui NÃO dá para trabalhar com a SECRET_KEY direto. A RPC
// sincronizar_vitoria_vitrine é SECURITY INVOKER com guarda is_admin(), e a edge
// function vitrine-gerar-case exige exigirMembroDoTime — as duas precisam de um
// JWT de usuário que exista em `mentores`. Com service role, auth.uid() é NULL e
// is_admin() dá false. Então usamos a SECRET_KEY só para emitir uma sessão de
// admin (generate_link + verify), e todo o resto vai com esse JWT.
//
// Idempotente: só pega vitória sem case (a RPC ainda tem índice único +
// ON CONFLICT por trás), então rodar de novo não duplica nada.
//
// Uso:
//   node scripts/vitrine/backfill-vitorias-aprovadas.mjs --env=prod --dry-run
//   node scripts/vitrine/backfill-vitorias-aprovadas.mjs --env=prod --limit=2
//   node scripts/vitrine/backfill-vitorias-aprovadas.mjs --env=prod
//   node scripts/vitrine/backfill-vitorias-aprovadas.mjs --env=prod --so-erros

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(__dirname, '../..')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  })
)
const DRY = Boolean(args['dry-run'])
const SO_ERROS = Boolean(args['so-erros'])
const LIMITE = args.limit ? Number(args.limit) : Infinity
const AMBIENTE = args.env === 'dev' ? 'dev' : 'prod'
const ADMIN = args.email || 'dono@rafaelgaldino.com.br'
// Pausa entre chamadas de IA: são chamadas de LLM em série, o gateway devolve
// 429 se a gente atropelar.
const PAUSA_MS = 1500

function lerEnv(arquivo) {
  return Object.fromEntries(
    readFileSync(join(RAIZ, arquivo), 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      })
  )
}

// O arquivo do DEV está sem o ponto inicial no repo (env.development.local);
// tentamos os dois nomes para o --env=dev não quebrar.
function envDoAmbiente() {
  if (AMBIENTE === 'prod') return lerEnv('web/.env.local')
  for (const nome of ['web/.env.development.local', 'web/env.development.local']) {
    try {
      return lerEnv(nome)
    } catch { /* tenta o próximo */ }
  }
  throw new Error('Não achei o .env do DEV (web/.env.development.local)')
}

const env = envDoAmbiente()
const URL_BASE = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const SECRET = env.SECRET_KEY
if (!URL_BASE || !ANON) throw new Error('VITE_SUPABASE_URL/ANON_KEY ausentes no .env')

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/** Sessão de admin sem senha: generate_link (service role) + verify. */
async function logarComoAdmin() {
  if (args.senha) {
    const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN, password: args.senha }),
    })
    const j = await r.json()
    if (!j.access_token) throw new Error(`Login falhou: ${JSON.stringify(j).slice(0, 200)}`)
    return j.access_token
  }
  if (!SECRET) throw new Error('Sem SECRET_KEY no .env e sem --senha=: não dá para autenticar')
  const g = await fetch(`${URL_BASE}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email: ADMIN }),
  })
  const gj = await g.json()
  if (!gj.hashed_token) throw new Error(`generate_link falhou: ${JSON.stringify(gj).slice(0, 200)}`)
  // hashed_token vai como token_hash (como `token` o GoTrue responde otp_expired).
  const v = await fetch(`${URL_BASE}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: gj.hashed_token }),
  })
  const vj = await v.json()
  if (!vj.access_token) throw new Error(`verify falhou: ${JSON.stringify(vj).slice(0, 200)}`)
  return vj.access_token
}

let TOKEN = null
const cab = () => ({ apikey: ANON, Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' })

async function rest(caminho, opcoes = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { ...opcoes, headers: { ...cab(), ...(opcoes.headers ?? {}) } })
  const txt = await r.text()
  if (!r.ok) throw new Error(`${r.status} ${caminho} → ${txt.slice(0, 300)}`)
  return txt ? JSON.parse(txt) : null
}

const normalizar = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

// ── Passo 0: fichas da vitrine que existem mas nunca foram vinculadas ────────
//
// A RPC procura o cliente por id_cliente; sem achar, cria ficha nova. Se a
// empresa já tem ficha antiga (com logo!) e id_cliente NULL — as pendências
// herdadas da importação do legado —, o backfill criaria uma segunda ficha da
// mesma empresa. Então vinculamos antes.
async function resolverVinculosPendentes(vitorias) {
  const pendentes = await rest('vitrine_clientes?id_cliente=is.null&select=id,empresa_nome,logo_path,vinculo_status')
  if (!pendentes.length) return []

  const acoes = []
  for (const v of vitorias) {
    if (!v.id_cliente) continue
    const alvo = normalizar(v.cliente_nome)
    if (alvo.length < 4) continue
    // Exato primeiro; depois prefixo ("CTrês" ⊂ "CTrês - Gestão e Performance"),
    // e só quando o prefixo casa com UMA ficha — ambiguidade a gente não chuta.
    const exatas = pendentes.filter((p) => normalizar(p.empresa_nome) === alvo)
    const prefixo = pendentes.filter((p) => {
      const n = normalizar(p.empresa_nome)
      return n.length >= 4 && (alvo.startsWith(n) || n.startsWith(alvo))
    })
    const casadas = exatas.length ? exatas : prefixo
    if (casadas.length !== 1) continue
    const ficha = casadas[0]
    if (acoes.some((a) => a.ficha.id === ficha.id)) continue
    acoes.push({ ficha, vitoria: v })
  }

  for (const { ficha, vitoria } of acoes) {
    const [cli] = await rest(
      `clientes_entrada_new?id_cliente=eq.${vitoria.id_cliente}&select=codigo_cliente,nicho,subnicho,nome_cliente_formatado`
    )
    console.log(
      `  vínculo: ficha "${ficha.empresa_nome}"${ficha.logo_path ? ' (com logo)' : ''} → ${vitoria.cliente_nome} · código ${cli?.codigo_cliente ?? '—'}`
    )
    if (DRY) continue
    await rest(`vitrine_clientes?id=eq.${ficha.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id_cliente: vitoria.id_cliente,
        codigo_cliente: cli?.codigo_cliente ?? null,
        cliente_nome: cli?.nome_cliente_formatado ?? null,
        nicho: cli?.nicho ?? null,
        subnicho: cli?.subnicho ?? null,
        vinculo_status: 'vinculado',
        vinculo_metodo: 'backfill_vitoria',
      }),
    })
  }
  return acoes
}

// ── Passo 3: IA escreve os blocos editoriais ────────────────────────────────
async function enriquecer(vitrineCaseId, tentativa = 1) {
  const r = await fetch(`${URL_BASE}/functions/v1/vitrine-gerar-case`, {
    method: 'POST',
    headers: cab(),
    body: JSON.stringify({ vitrine_case_id: vitrineCaseId, persistir: true }),
  })
  const j = await r.json().catch(() => ({}))
  if (r.ok) return { ok: true }
  // 429/504 são transitórios (gateway ocupado / LLM lenta): vale um retry.
  if ([429, 504].includes(r.status) && tentativa < 3) {
    await espera(5000 * tentativa)
    return enriquecer(vitrineCaseId, tentativa + 1)
  }
  return { ok: false, erro: j.error ?? `HTTP ${r.status}` }
}

async function main() {
  console.log(`\n⚙  Backfill de vitórias → vitrine · ambiente ${AMBIENTE.toUpperCase()}${DRY ? ' · DRY-RUN' : ''}\n`)
  TOKEN = await logarComoAdmin()
  console.log(`   autenticado como ${ADMIN}\n`)

  if (SO_ERROS) {
    const erros = await rest('vitrine_cases?ia_status=eq.erro&select=id,case_id,empresa_nome,ia_erro')
    console.log(`Cases com falha de IA: ${erros.length}`)
    for (const c of erros) {
      console.log(`  ${c.case_id} · ${c.empresa_nome} · erro anterior: ${c.ia_erro ?? '—'}`)
      if (DRY) continue
      const r = await enriquecer(c.id)
      console.log(`    → ${r.ok ? 'ok' : 'FALHOU: ' + r.erro}`)
      await espera(PAUSA_MS)
    }
    return
  }

  // ── Passo 1: quem está aprovado e fora da vitrine
  const vitorias = await rest(
    'repositorio_vitorias?status=in.(aprovada,case)&select=id,titulo,cliente_nome,id_cliente,area,origem,descricao&order=created_at'
  )
  const cases = await rest('vitrine_cases?repositorio_vitoria_id=not.is.null&select=repositorio_vitoria_id')
  const jaTem = new Set(cases.map((c) => c.repositorio_vitoria_id))
  const alvo = vitorias.filter((v) => !jaTem.has(v.id)).slice(0, LIMITE)

  console.log(`Aprovadas: ${vitorias.length} · já na vitrine: ${jaTem.size} · a processar: ${alvo.length}\n`)
  if (!alvo.length) {
    console.log('Nada pendente. 🎉\n')
    return
  }

  // ── Passo 0 (antes de criar case algum)
  console.log('Vínculos pendentes de cliente:')
  const vinculos = await resolverVinculosPendentes(alvo)
  if (!vinculos.length) console.log('  nenhum')
  console.log('')

  // ── Passos 2 e 3, vitória por vitória
  const relatorio = []
  for (const [i, v] of alvo.entries()) {
    const rotulo = `[${i + 1}/${alvo.length}] ${v.cliente_nome} · ${v.titulo.slice(0, 60)}`
    if (DRY) {
      console.log(`${rotulo}\n    → criaria o case e geraria o texto (${(v.descricao ?? '').length} chars de descrição)`)
      continue
    }
    console.log(rotulo)
    let linha = { empresa: v.cliente_nome, case_id: '—', ia: 'não criado' }
    try {
      const saida = await rest('rpc/sincronizar_vitoria_vitrine', {
        method: 'POST',
        body: JSON.stringify({ p_vitoria_id: v.id }),
      })
      const r = Array.isArray(saida) ? saida[0] : saida
      if (!r?.vitrine_case_id) throw new Error('a RPC não devolveu case (status da vitória mudou?)')
      const [caso] = await rest(`vitrine_cases?id=eq.${r.vitrine_case_id}&select=case_id`)
      linha.case_id = caso?.case_id ?? r.vitrine_case_id
      console.log(`    case ${linha.case_id} ${r.criado ? 'criado' : '(já existia)'} · gerando texto...`)

      const g = await enriquecer(r.vitrine_case_id)
      linha.ia = g.ok ? 'pronto' : `erro: ${g.erro}`
      console.log(`    → ${linha.ia}`)
    } catch (e) {
      linha.ia = `FALHOU: ${e.message}`
      console.log(`    → ${linha.ia}`)
    }
    relatorio.push(linha)
    await espera(PAUSA_MS)
  }

  if (!DRY) {
    console.log('\n── Resultado ──')
    for (const l of relatorio) console.log(`  ${l.case_id.padEnd(9)} ${l.ia.padEnd(28)} ${l.empresa}`)
    const falhas = relatorio.filter((l) => l.ia !== 'pronto')
    console.log(
      `\n${relatorio.length - falhas.length}/${relatorio.length} com texto pronto.` +
        (falhas.length ? ` Reprocesse as falhas com --so-erros.` : '')
    )
  }
  console.log('')
}

main().catch((e) => {
  console.error('\n✖', e.message, '\n')
  process.exit(1)
})

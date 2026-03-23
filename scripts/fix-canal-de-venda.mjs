import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Lê credenciais do .env.local
const envRaw = readFileSync(join(__dirname, '../web/.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

// --- CSV parser simples com suporte a campos entre aspas ---
function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function normalize(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(ltda|eireli|s\/a|sa|me|ss|lda|epp|s\.a\.?)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstAndLastName(fullName) {
  const parts = normalize(fullName).split(' ').filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return parts[0] + ' ' + parts[parts.length - 1]
}

// Lê o CSV
const csvText = readFileSync(join(__dirname, '../.claude/clientes-organizando.csv'), 'utf8')
const lines = csvText.split('\n').filter(l => l.trim())
const headers = parseCsvLine(lines[0])

// Índices das colunas relevantes
const COL = {
  canal: headers.indexOf('CANAIS DE VENDA'),
  cliente: headers.indexOf('NOME DO CLIENTE'),
  empresa: headers.indexOf('NOME DA EMPRESA'),
  encontrado: headers.indexOf('Encontrado?'),
}

const csvRows = lines.slice(1).map(l => {
  const f = parseCsvLine(l)
  return {
    canal: f[COL.canal] || '',
    cliente: f[COL.cliente] || '',
    empresa: f[COL.empresa] || '',
    encontrado: f[COL.encontrado] || '',
    raw: f,
  }
}).filter(r => {
  // Processa apenas linhas com Encontrado? != "nao..." (case-insensitive)
  const enc = r.encontrado.toLowerCase().trim()
  return !enc.startsWith('nao') && enc !== '' && enc !== 'duplicado'
})

console.log(`\n📋 CSV: ${csvRows.length} linhas elegíveis para match\n`)

// Busca todos os clientes do banco
const { data: dbClientes, error } = await supabase
  .from('clientes_entrada_new')
  .select('id_cliente, codigo_cliente, nome_cliente, nome_empresa, canal_de_venda')

if (error) {
  console.error('Erro ao buscar clientes:', error)
  process.exit(1)
}

console.log(`🗄️  DB: ${dbClientes.length} clientes encontrados\n`)

// Pré-processa o DB
const dbNorm = dbClientes.map(c => ({
  ...c,
  emp_norm: normalize(c.nome_empresa || ''),
  cli_norm: normalize(c.nome_cliente || ''),
  cli_key: firstAndLastName(c.nome_cliente || ''),
}))

const updates = []
const results = { match: 0, already_ok: 0, ambig: 0, no_match: 0 }

for (const row of csvRows) {
  const empNorm = normalize(row.empresa)
  const cliNorm = normalize(row.cliente)
  const cliKey = firstAndLastName(row.cliente)
  const canalCSV = row.canal.trim()

  let matches = []
  let matchType = ''

  // 1. Match exato por empresa (se empresa não é N/A / vazio)
  if (empNorm && empNorm !== 'n a' && empNorm !== 'n/a') {
    const exact = dbNorm.filter(c => c.emp_norm && c.emp_norm === empNorm)
    if (exact.length > 0) { matches = exact; matchType = 'empresa-exato' }

    // 2. Match parcial por empresa (um contém o outro, mínimo 6 chars)
    if (matches.length === 0 && empNorm.length >= 6) {
      const partial = dbNorm.filter(c =>
        c.emp_norm && c.emp_norm.length >= 6 &&
        (c.emp_norm.includes(empNorm) || empNorm.includes(c.emp_norm))
      )
      if (partial.length > 0) { matches = partial; matchType = 'empresa-parcial' }
    }
  }

  // 3. Fallback: match por nome do cliente (primeiro + último nome)
  if (matches.length === 0 && cliKey.length >= 4) {
    const byName = dbNorm.filter(c => c.cli_key && c.cli_key === cliKey)
    if (byName.length > 0) { matches = byName; matchType = 'cliente-nome' }
  }

  // 4. Fallback: match parcial por nome completo normalizado
  if (matches.length === 0 && cliNorm.length >= 6) {
    const partial = dbNorm.filter(c =>
      c.cli_norm && c.cli_norm.length >= 6 &&
      (c.cli_norm.includes(cliNorm) || cliNorm.includes(c.cli_norm))
    )
    if (partial.length > 0) { matches = partial; matchType = 'cliente-parcial' }
  }

  const tag = `[${row.empresa || row.cliente}]`

  if (matches.length === 0) {
    console.log(`❌ NO_MATCH | ${tag} → não encontrado no banco`)
    results.no_match++
  } else if (matches.length > 1) {
    const ids = matches.map(m => m.codigo_cliente).join(', ')
    console.log(`❓ AMBIG    | ${tag} → ${matches.length} matches (${ids}) — skip`)
    results.ambig++
  } else {
    const db = matches[0]
    if (db.canal_de_venda === canalCSV) {
      console.log(`✅ MATCH    | ${tag} → codigo ${db.codigo_cliente} → "${canalCSV}" (já correto, skip)`)
      results.already_ok++
    } else {
      console.log(`✅ MATCH    | ${tag} → codigo ${db.codigo_cliente} → "${db.canal_de_venda}" → "${canalCSV}" (${matchType}, UPDATE)`)
      updates.push({ id_cliente: db.id_cliente, canal_de_venda: canalCSV, codigo: db.codigo_cliente, tag })
      results.match++
    }
  }
}

console.log(`\n---`)
console.log(`✅ Updates pendentes : ${updates.length}`)
console.log(`✅ Já corretos (skip): ${results.already_ok}`)
console.log(`❓ Ambíguos (skip)   : ${results.ambig}`)
console.log(`❌ Não encontrados   : ${results.no_match}`)

if (updates.length === 0) {
  console.log('\nNenhum update necessário.')
  process.exit(0)
}

console.log('\n🚀 Aplicando updates...\n')

let ok = 0
let fail = 0
for (const upd of updates) {
  const { error } = await supabase
    .from('clientes_entrada_new')
    .update({ canal_de_venda: upd.canal_de_venda })
    .eq('id_cliente', upd.id_cliente)

  if (error) {
    console.error(`  ❌ FALHOU | ${upd.tag} (codigo ${upd.codigo}):`, error.message)
    fail++
  } else {
    console.log(`  ✅ OK      | ${upd.tag} (codigo ${upd.codigo}) → "${upd.canal_de_venda}"`)
    ok++
  }
}

console.log(`\n✅ ${ok} updates aplicados com sucesso`)
if (fail > 0) console.log(`❌ ${fail} updates falharam`)

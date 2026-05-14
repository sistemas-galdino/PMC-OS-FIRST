// Espelha reuniões do Galdino entre clientes do mesmo dono.
// Para cada par em MIRRORS, copia as reuniões de `reunioes_galdino` do cliente
// `sourceCodigo` para uma linha-espelho vinculada ao `targetCodigo`, pra que a
// reunião apareça nos dois sistemas (o front filtra estritamente por id_cliente).
//
// A linha-espelho usa id_reuniao sufixado (`<id>#espelho-<codigo>`) — assim o
// enrich/reconcile (que casam por id_reuniao = event.id) nunca a tocam, e o
// re-run é idempotente.
//
// Uso:
//   node mirror-reunioes-galdino.mjs --dry-run   # preview
//   node mirror-reunioes-galdino.mjs             # executa

import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envRaw = readFileSync(join(__dirname, '../web/.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)
const SECRET = env.SECRET_KEY || env.SUPABASE_SERVICE_ROLE
const SUPABASE_KEY = SECRET || env.VITE_SUPABASE_ANON_KEY
if (SECRET) console.log('🔑 Usando secret_key (passa do RLS)')
const supabase = createClient(env.VITE_SUPABASE_URL, SUPABASE_KEY)

const DRY_RUN = process.argv.includes('--dry-run')

// Pares de espelhamento — reuniões do Galdino do `sourceCodigo` são copiadas
// para o `targetCodigo` (clientes do mesmo dono). Adicione um objeto aqui pra
// criar um par novo.
const MIRRORS = [
  { sourceCodigo: 259, targetCodigo: 335 }, // Il Piacere Restaurante → Pousada Ares Da Serra
]

const suffixo = (codigo) => `#espelho-${codigo}`

// Colunas que NÃO são copiadas literalmente da reunião-fonte.
const NAO_COPIAR = new Set(['id_unico', 'id_reuniao', 'created_at'])

async function main() {
  console.log(`=== Mirror Reuniões Galdino ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`)

  const codigos = [...new Set(MIRRORS.flatMap(m => [m.sourceCodigo, m.targetCodigo]))]
  const { data: clientes, error: cliErr } = await supabase
    .from('clientes_entrada_new')
    .select('id_cliente, codigo_cliente, nome_empresa, nome_empresa_formatado')
    .in('codigo_cliente', codigos)
  if (cliErr) throw cliErr
  const clienteByCodigo = new Map(clientes.map(c => [c.codigo_cliente, c]))

  const totals = { inserted: 0, updated: 0, skipped: 0 }

  for (const { sourceCodigo, targetCodigo } of MIRRORS) {
    const source = clienteByCodigo.get(sourceCodigo)
    const target = clienteByCodigo.get(targetCodigo)
    if (!source || !target) {
      console.log(`⚠️  Par ${sourceCodigo}→${targetCodigo}: cliente não encontrado em clientes_entrada_new — pulando`)
      continue
    }
    console.log(`\n📁 ${sourceCodigo} (${source.nome_empresa}) → ${targetCodigo} (${target.nome_empresa})`)

    const { data: origens, error: srcErr } = await supabase
      .from('reunioes_galdino')
      .select('*')
      .eq('id_cliente', source.id_cliente)
      .not('id_reuniao', 'like', '%#espelho-%')
    if (srcErr) throw srcErr
    console.log(`   ${origens.length} reunião(ões) do Galdino na origem`)

    for (const orig of origens) {
      const idEspelho = orig.id_reuniao + suffixo(targetCodigo)

      // Conteúdo copiado da origem (campos de vínculo são sobrescritos depois).
      const conteudo = {}
      for (const [k, v] of Object.entries(orig)) {
        if (!NAO_COPIAR.has(k)) conteudo[k] = v
      }
      conteudo.id_cliente = target.id_cliente
      conteudo.codigo_cliente = target.codigo_cliente
      conteudo.empresa = target.nome_empresa
      conteudo.nome_empresa_formatado = target.nome_empresa_formatado
      // pessoa / nome_cliente_formatado mantidos do original de propósito.
      conteudo.metodo_match = 'espelho'

      const { data: existing, error: exErr } = await supabase
        .from('reunioes_galdino')
        .select('id_unico')
        .eq('id_reuniao', idEspelho)
        .maybeSingle()
      if (exErr) throw exErr

      if (DRY_RUN) {
        console.log(`   ${existing ? '🔧' : '➕'} ${orig.data_reuniao} ${orig.pessoa || ''} → ${idEspelho}`)
        existing ? totals.updated++ : totals.inserted++
        continue
      }

      if (existing) {
        const { error } = await supabase
          .from('reunioes_galdino')
          .update(conteudo)
          .eq('id_reuniao', idEspelho)
        if (error) { console.log(`   ❌ update ${idEspelho}: ${error.message}`); continue }
        console.log(`   🔧 atualizado ${orig.data_reuniao} ${orig.pessoa || ''}`)
        totals.updated++
      } else {
        const { error } = await supabase
          .from('reunioes_galdino')
          .insert({ ...conteudo, id_unico: randomUUID(), id_reuniao: idEspelho })
        if (error) { console.log(`   ❌ insert ${idEspelho}: ${error.message}`); continue }
        console.log(`   ➕ inserido ${orig.data_reuniao} ${orig.pessoa || ''}`)
        totals.inserted++
      }
    }
  }

  console.log(`\n=== Resumo ===`)
  console.log(`inseridos=${totals.inserted} atualizados=${totals.updated}`)
}

main().catch(err => { console.error('❌', err.message); console.error(err.stack); process.exit(1) })

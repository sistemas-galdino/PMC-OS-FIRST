// Popula `recursos_programa` com um item EDITÁVEL por consultor ativo, apontando
// pro link público de agendamento (/atendimento/<slug>). Substitui as agendas
// manuais antigas. Os itens viram cards normais em "Links Importantes" (admin
// edita/exclui pelo lápis/lixeira; cliente vê só o link).
//
// Uso:
//   node seed-recursos-agendas.mjs            -> DRY-RUN: mostra o que apaga/insere
//   node seed-recursos-agendas.mjs --apply    -> aplica (apaga antigas + insere)
//
// Idempotente: cada --apply apaga as categorias de agenda e reinsere do zero.
// Usa SECRET_KEY (service role) de web/.env.local pra passar do RLS.

import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envRaw = readFileSync(join(__dirname, '../web/.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)
const SECRET = env.SECRET_KEY || env.SUPABASE_SERVICE_ROLE
if (!SECRET) {
  console.error('❌ SECRET_KEY/SUPABASE_SERVICE_ROLE não encontrada em web/.env.local (RLS bloqueia anon).')
  process.exit(1)
}
const supabase = createClient(env.VITE_SUPABASE_URL, SECRET)
const APPLY = process.argv.includes('--apply')

// tabela_destino -> categoria + ícone do card
const MAP = {
  reunioes_mentoria_new: { categoria: 'Agenda Consultores', icone: '👤' },
  reunioes_blackcrm:     { categoria: 'Agenda CRM (Tutorias)', icone: '⚙️' },
  reunioes_galdino:      { categoria: 'Agenda Galdino', icone: '📅' },
}
const CATEGORIAS = [...new Set(Object.values(MAP).map(m => m.categoria))]

// 1) Consultores ativos -> linhas novas
const { data: consultores, error: cErr } = await supabase
  .from('consultores_atendimento')
  .select('nome, slug, ordem, tabela_destino')
  .eq('ativo', true)
  .order('ordem', { ascending: true })
if (cErr) { console.error('❌ Erro lendo consultores_atendimento:', cErr.message); process.exit(1) }

const novas = (consultores ?? []).map(c => {
  const m = MAP[c.tabela_destino] ?? { categoria: 'Agenda Consultores', icone: '👤' }
  return { titulo: c.nome, url: `/atendimento/${c.slug}`, icone: m.icone, categoria: m.categoria, ordem: c.ordem ?? 0, ativo: true }
})

// 2) O que será apagado (agendas antigas)
const { data: antigas } = await supabase
  .from('recursos_programa')
  .select('id, titulo, categoria')
  .in('categoria', CATEGORIAS)

console.log(`\n🗑️  Apagar ${antigas?.length ?? 0} linha(s) antiga(s) nas categorias: ${CATEGORIAS.join(', ')}`)
for (const r of antigas ?? []) console.log(`      • [${r.categoria}] ${r.titulo}`)

console.log(`\n➕ Inserir ${novas.length} link(s) (1 por consultor ativo):`)
const porCat = {}
for (const n of novas) (porCat[n.categoria] ??= []).push(n)
for (const [cat, items] of Object.entries(porCat)) {
  console.log(`   ${cat} (${items.length})`)
  for (const it of items) console.log(`      • ${it.icone} ${it.titulo}  ->  ${it.url}`)
}

if (!APPLY) {
  console.log('\n🔍 DRY-RUN — nada foi gravado. Rode com --apply pra aplicar.\n')
  process.exit(0)
}

const { error: delErr } = await supabase.from('recursos_programa').delete().in('categoria', CATEGORIAS)
if (delErr) { console.error('❌ Erro apagando antigas:', delErr.message); process.exit(1) }

const { data: inseridas, error: insErr } = await supabase.from('recursos_programa').insert(novas).select('id')
if (insErr) { console.error('❌ Erro inserindo:', insErr.message); process.exit(1) }

console.log(`\n✅ Pronto. Apagadas ${antigas?.length ?? 0}, inseridas ${inseridas?.length ?? 0}.\n`)

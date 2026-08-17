// Importa o acervo da Vitrine de Cases (backup do sistema antigo) para as
// tabelas vitrine_* do PMC OS.
//
// Autentica como admin (login de verdade, via GoTrue) em vez de usar
// SECRET_KEY: as políticas de RLS são `is_admin()`, então um admin logado
// escreve normalmente — e assim o script não depende de service role nenhum.
//
// Idempotente: upsert por origem_legado_uuid (clientes) e case_id (cases).
//
// Uso:
//   node scripts/vitrine/importar.mjs --env=dev  --email=... --senha=...
//   node scripts/vitrine/importar.mjs --env=prod --email=... --senha=...
//   ... --dry-run   → só imprime o de-para, não escreve nada

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(__dirname, '../..')
const BACKUP = '/Users/davidabn/cases-pmc/vitrine-cases-clientes-pmc/backups/2026-08-17T00-46-12'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  })
)
const DRY = Boolean(args['dry-run'])
const AMBIENTE = args.env === 'prod' ? 'prod' : 'dev'

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
const env = lerEnv(AMBIENTE === 'prod' ? 'web/.env.local' : 'web/.env.development.local')
const URL_BASE = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY

// PENDENTE_VALIDACAO é marcador interno do legado: nunca pode chegar na tela.
const SENTINELA = new Set(['PENDENTE_VALIDACAO', 'N/A', 'NA', '', 'Sem site'])
const limpo = (v) => {
  if (v == null) return null
  const s = typeof v === 'string' ? v.trim() : v
  return typeof s === 'string' && SENTINELA.has(s) ? null : s
}
const arr = (v) => {
  if (!v) return []
  const partes = Array.isArray(v) ? v : String(v).split(/\s*\|\s*|\n/)
  return partes.map(limpo).filter(Boolean)
}
// As logos do legado viram arquivos estáticos em web/public/vitrine-logos/:
// 'originais/' guarda o arquivo como veio, 'display/' a cópia normalizada
// (margens recortadas, encaixe uniforme) que a apresentação usa.
// Convenção que o front resolve: caminho começando com '/' = arquivo local;
// qualquer outro = objeto no bucket vitrine-logos (upload novo pela tela).
const logoPublica = (p, pasta) => (p ? `/vitrine-logos/${pasta}/${p.split('/').pop()}` : null)

// Os 3 clientes que o legado salvou com slug em vez do uuid do PMC OS.
const VINCULO_MANUAL = {
  'LINE-ATUADORES': { id_cliente: 'ce865640-80d0-472f-bb77-df61450cee6a', codigo: 307, metodo: 'nome_empresa' },
}
const PENDENTES = {
  'DROGARIA-ULTRA-POPULAR': '2 cadastros no PMC OS: 369 (Drogaria Ultra Popular) e 380 (Drogarias Ultra Popular)',
  C3: 'sem correspondência em clientes_entrada_new',
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

function rest(token) {
  const cab = {
    apikey: ANON,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  return {
    async get(caminho) {
      const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { headers: cab })
      if (!r.ok) throw new Error(`GET ${caminho}: ${r.status} ${await r.text()}`)
      return r.json()
    },
    async upsert(tabela, onConflict, linhas) {
      const LOTE = 100
      for (let i = 0; i < linhas.length; i += LOTE) {
        const r = await fetch(
          `${URL_BASE}/rest/v1/${tabela}?on_conflict=${onConflict}`,
          {
            method: 'POST',
            headers: { ...cab, Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(linhas.slice(i, i + LOTE)),
          }
        )
        if (!r.ok) throw new Error(`upsert ${tabela}[${i}]: ${r.status} ${await r.text()}`)
        process.stdout.write(`  ${tabela}: ${Math.min(i + LOTE, linhas.length)}/${linhas.length}\r`)
      }
      console.log(`  ${tabela}: ${linhas.length}/${linhas.length} ✓`)
    },
  }
}

async function main() {
  const mapaTxt = readFileSync(join(__dirname, 'mapa-uuid-codigo.txt'), 'utf8').trim()
  const mapa = new Map(mapaTxt.split(',').map((p) => {
    const [u, c] = p.split('=')
    return [u.trim(), Number(c)]
  }))

  const clients = JSON.parse(readFileSync(`${BACKUP}/clients.json`, 'utf8'))
  const victories = JSON.parse(readFileSync(`${BACKUP}/victories.json`, 'utf8'))

  // ---- de-para de clientes ----
  const resolvido = new Map()
  const linhasClientes = clients.map((c) => {
    const origem = c.external_client_id
    let id_cliente = null, codigo = null, metodo = null, candidatos = null
    if (mapa.has(origem)) {
      // O external_client_id do legado É o clientes_entrada_new.id_cliente:
      // a base da vitrine saiu de um export do próprio PMC OS.
      id_cliente = origem; codigo = mapa.get(origem); metodo = 'uuid_legado'
    } else if (VINCULO_MANUAL[origem]) {
      ({ id_cliente, codigo, metodo } = VINCULO_MANUAL[origem])
    } else {
      candidatos = PENDENTES[origem] ?? null
    }
    const empresa = limpo(c.company_name) || '(sem nome)'
    resolvido.set(c.id, { origem, id_cliente, codigo, empresa })
    return {
      id_cliente, codigo_cliente: codigo,
      empresa_nome: empresa,
      cliente_nome: limpo(c.client_name),
      nicho: limpo(c.niche), subnicho: limpo(c.subniche),
      cs_responsavel: limpo(c.cs_responsible),
      consultor_responsavel: limpo(c.consultant_responsible),
      site: limpo(c.website), instagram: limpo(c.instagram),
      logo_path: logoPublica(limpo(c.logo_path), 'originais'),
      logo_display_path: logoPublica(limpo(c.logo_display_path), 'display'),
      logo_status: limpo(c.logo_status) || 'pendente',
      logo_origem: limpo(c.logo_source),
      vinculo_status: id_cliente ? 'vinculado' : 'pendente',
      vinculo_metodo: metodo, vinculo_candidatos: candidatos,
      status_cliente: limpo(c.client_status),
      observacoes: limpo(c.notes),
      origem_legado_uuid: origem,
    }
  })

  const vinculados = linhasClientes.filter((l) => l.vinculo_status === 'vinculado').length
  console.log(`\n[${AMBIENTE}] clientes: ${linhasClientes.length} (vinculados ${vinculados}, pendentes ${linhasClientes.length - vinculados})`)
  for (const l of linhasClientes.filter((x) => x.vinculo_status === 'pendente')) {
    console.log(`  PENDENTE  ${l.empresa_nome} — ${l.vinculo_candidatos ?? 'sem candidato'}`)
  }

  if (DRY) { console.log('\n--dry-run: nada foi escrito.'); return }

  const token = await entrar()
  const api = rest(token)

  await api.upsert('vitrine_clientes', 'origem_legado_uuid', linhasClientes)

  // id da vitrine_clientes por origem, pra ligar as vitórias
  const salvos = await api.get('vitrine_clientes?select=id,origem_legado_uuid&limit=1000')
  const idPorOrigem = new Map(salvos.map((s) => [s.origem_legado_uuid, s.id]))

  let orfas = 0
  const linhasCases = victories.flatMap((v) => {
    const cli = resolvido.get(v.client_id)
    const vitrineClienteId = cli && idPorOrigem.get(cli.origem)
    if (!vitrineClienteId) { orfas++; return [] }
    return [{
      case_id: v.case_id,
      vitrine_cliente_id: vitrineClienteId,
      id_cliente: cli.id_cliente, codigo_cliente: cli.codigo, empresa_nome: cli.empresa,
      headline_impacto: limpo(v.impact_headline),
      headline_vitrine: limpo(v.showcase_headline),
      headline_curta: limpo(v.short_headline),
      categoria: limpo(v.category),
      foco_ia: Boolean(v.ai_focus),
      ferramenta_card: limpo(v.card_tool), ferramenta_ia: limpo(v.ai_tool),
      resumo_executivo: limpo(v.executive_summary),
      como_era_antes: limpo(v.before_scenario),
      principais_gargalos: arr(v.main_bottlenecks),
      como_ficou_depois: limpo(v.after_scenario),
      o_que_pmc_transformou: limpo(v.pmc_transformation),
      principais_ganhos: arr(v.main_gains),
      solucao_criada: limpo(v.solution_created),
      processo_atual: limpo(v.current_process),
      resultado_principal: limpo(v.main_result),
      status_implementacao: limpo(v.implementation_status),
      status_publicacao: limpo(v.publication_status) || 'nao_publicado',
      status_validacao: limpo(v.validation_status),
      nivel_evidencia: limpo(v.evidence_level),
      aprovado_vitrine: Boolean(v.approved_for_showcase),
      destaque: Boolean(v.is_featured),
      ordem_vitrine: v.showcase_order ?? null,
      arquivado: Boolean(v.is_archived),
      capa_url: limpo(v.cover_image_url),
      palavras_chave: arr(v.keywords),
      observacoes: limpo(v.notes),
      origem_legado_uuid: v.id,
    }]
  })
  console.log(`cases: ${linhasCases.length}${orfas ? ` (${orfas} órfãs ignoradas)` : ''}`)
  await api.upsert('vitrine_cases', 'case_id', linhasCases)

  // Confere no banco em vez de confiar no "inseridos = N".
  const cabecalho = { apikey: ANON, Authorization: `Bearer ${token}`, Prefer: 'count=exact', Range: '0-0' }
  for (const t of ['vitrine_clientes', 'vitrine_cases', 'vitrine_showcase']) {
    const r = await fetch(`${URL_BASE}/rest/v1/${t}?select=*`, { headers: cabecalho })
    console.log(`  ${t}: ${r.headers.get('content-range')?.split('/')[1]} linhas no banco`)
  }
}

main().catch((e) => { console.error('\nERRO:', e.message); process.exit(1) })

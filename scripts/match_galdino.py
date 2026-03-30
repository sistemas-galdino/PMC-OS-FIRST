#!/usr/bin/env python3
import json, re, unicodedata
from datetime import datetime, timedelta

with open('/tmp/clientes_db.json', 'r', encoding='utf-8') as f:
    clientes = json.load(f)

events_all = []
for path in ['/tmp/cal_dono_2025.json', '/tmp/cal_dono_2026.json']:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    events_all.extend(data.get('items', []))

def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()

def clean_pmc(s):
    if not s: return ''
    s = re.sub(r'\s*and\s+Rafael\s+Galdino\b', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\|\s*PMC\s*(?:START)?\s*', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\bPMC\s*(?:START)?\b', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\bRafael\s+Galdino\b', '', s, flags=re.IGNORECASE)
    return s.strip().strip('|').strip('-').strip()

SKIP_PATTERNS = [
    r'Reuni[\xe3a]o geral', r'Recesso time PMC', r'Tutoria Black',
    r'MENTORIA com RAFAEL', r'Configura[\xe7c][\xe3a]o Guru', r'Checklist Guru',
    r'Ofertas Que Vendem', r'^Thiago Galdino$', r'^Maiara Gadelha$',
    r'^Maiara Silva$', r'Alinhamento.*Thiago', r'Alinhamento comercial',
    r'Thiago Closer', r'Reuni[\xe3a]o com o Comercial', r'PMC.*EXCLUSIVO DENNER',
    r'Reuni[\xe3a]o.*Thiago.*Treino', r'Teste.*Maiara',
]

def is_internal(summary):
    if not summary: return True
    for pat in SKIP_PATTERNS:
        if re.search(pat, summary, re.IGNORECASE): return True
    return False

HARDCODED = {
    'super mercados indio': 154, 'supermercados indio': 154,
    'cafe do vo vicente': 160, 'lagostao pescados': 172,
    'global pescados': 172, 'b. & alfaiataria': 170,
    'b & alfaiataria': 170, 'cot afonso pena': 156,
    'lopes consultoria': 173,
    # Additional aliases discovered from unmatched events
    'skyhighimob': 181, 'skyhigh': 181,
    'grupo horebe': 237, 'horebe': 237,
    'gauchos online': 188,
    'grupo caxias': 194, 'piscicultura caxias': 194,
    'borleme comercial': 183, 'borleme': 183,
    'miketec': 195,
    'dado salau': 246, 'mega tintas': 246,
    'zeca vieira': 253,
    'flavio zanella': None,  # not in DB
    'ht4 tecnologia': 108,
    'audrey weirich': 108,  # HT4 Teconologia
    'egon e nathalia': 203,  # Casa Di Campo / Egon Otto Rehn Junior
    'egon': 203,
    'geraldo moraes secury': 230,  # Secury On Brasil
    'fechine marmoraria': 211,  # Fechine Marmores E Granitos
    'fechine': 211,
    'simone senes thomas': 130,  # Thomasadvocacia / Sidinei Thomas - same family
    'carolina pitthan': None,  # not in DB
    'carolina martins pitthan': None,  # not in DB
    'ricardo caceres': None,  # not in DB
    'betina pimentel': None,  # not in DB
    'simara almeida': None,  # not in DB
    'beatriz aquino': None,  # not in DB
    'breno souza': None,  # not in DB
    'domingos': None,  # not in DB (Clinica Mantelli)
    'clinica mantelli': None,  # not in DB
    'anderson paixao': None,  # not in DB (Madelotus)
    'madelotus': None,  # not in DB
    'elier': None,  # not in DB (Equipe Veiculos)
    'equipe veiculos': None,  # not in DB
    'rl cura e essencia': None,  # not in DB
    'raquel barea': None,  # not in DB
    'grupo vax': None,  # not in DB
    'arguto': None,  # not in DB
    'develcode': None,  # not in DB
    'jhow motos': None,  # not in DB
    'la beauty': None,  # not in DB
    'supertex concreto': None,  # not in DB
    'aline': None,  # not in DB (single name)
    'jonathan jose de freitas': None,  # not in DB
    'daniel bruno': 239,  # Bruno Armino -> Daniel Bruno Armino
}

def check_hardcoded(title_norm):
    for alias, cod in HARDCODED.items():
        if cod is not None and alias in title_norm: return cod
    return None

def extract_from_title(summary):
    title = summary.strip()
    empresa, pessoa = '', ''
    m = re.match(r'(?:PMC\s*-\s*)?Reuni.o\s+Individual\s*-\s*Rafael\s+Galdino\s*\((.+?)\)\s*$', title, re.IGNORECASE)
    if m:
        inner = m.group(1).strip()
        if '|' in inner:
            parts = [p.strip() for p in inner.split('|')]
            pessoa = parts[0]
            empresa = parts[1] if len(parts) > 1 else ''
        else:
            pessoa = inner
        return clean_pmc(empresa), clean_pmc(pessoa)
    if '|' in title:
        parts = [clean_pmc(p.strip()) for p in title.split('|')]
        parts = [p for p in parts if p]
        if len(parts) >= 2:
            empresa, pessoa = parts[0], parts[1]
        elif len(parts) == 1:
            pessoa = parts[0]
        return clean_pmc(empresa), clean_pmc(pessoa)
    m = re.match(r'(.+?)\s+and\s+Rafael\s+Galdino', title, re.IGNORECASE)
    if m:
        return '', clean_pmc(m.group(1).strip())
    cleaned = clean_pmc(title)
    if cleaned: pessoa = cleaned
    return empresa, pessoa

def match_empresa_exact(empresa_n, clientes):
    if not empresa_n or len(empresa_n) < 3: return None
    for c in clientes:
        ne = norm(c['nome_empresa'])
        if ne == 'n/a': continue
        if empresa_n in ne or ne in empresa_n: return c
    return None

def match_pessoa_exact(pessoa_n, clientes):
    if not pessoa_n: return None
    tokens = pessoa_n.split()
    if len(tokens) < 2:
        if len(pessoa_n) < 4: return None
        for c in clientes:
            nc = norm(c['nome_cliente'])
            if pessoa_n == nc or (len(pessoa_n) > 4 and pessoa_n in nc): return c
        return None
    first, last = tokens[0], tokens[-1]
    for c in clientes:
        nc = norm(c['nome_cliente'])
        t = nc.split()
        if not t: continue
        if first == t[0] and last == t[-1]: return c
    for c in clientes:
        nc = norm(c['nome_cliente'])
        t = nc.split()
        if first in t and last in t: return c
    return None

def match_empresa_fuzzy(empresa_n, clientes):
    if not empresa_n: return None
    words = [w for w in empresa_n.split() if len(w) > 3]
    if not words: return None
    best, best_c = None, 0
    for c in clientes:
        ne = norm(c['nome_empresa'])
        if ne == 'n/a': continue
        cnt = sum(1 for w in words if w in ne)
        ratio = cnt / len(words)
        if cnt > best_c and ratio >= 0.5 and cnt >= 1:
            best_c, best = cnt, c
    return best

def match_pessoa_como_empresa(pessoa_n, clientes):
    if not pessoa_n: return None
    tokens = pessoa_n.split()
    if len(tokens) < 2:
        if len(pessoa_n) < 4: return None
        for c in clientes:
            ne = norm(c['nome_empresa'])
            if ne == 'n/a': continue
            if pessoa_n in ne: return c
        return None
    first, last = tokens[0], tokens[-1]
    for c in clientes:
        ne = norm(c['nome_empresa'])
        if ne == 'n/a': continue
        t = ne.split()
        if first in t and last in t: return c
    for c in clientes:
        ne = norm(c['nome_empresa'])
        if ne == 'n/a': continue
        if first in ne and last in ne and len(first) > 3 and len(last) > 3: return c
    return None

def extract_event_data(event):
    start = event.get('start', {})
    dt_str = start.get('dateTime', start.get('date', ''))
    if 'T' in dt_str:
        dt = datetime.fromisoformat(dt_str)
        date_str = dt.strftime('%Y-%m-%d')
        time_str = dt.strftime('%H:%M')
    elif dt_str:
        dt = datetime.strptime(dt_str, '%Y-%m-%d')
        date_str = dt_str
        time_str = ''
    else:
        return {}
    ano, mes = dt.year, dt.month
    semana = dt.isocalendar()[1]
    monday = dt - timedelta(days=dt.weekday())
    friday = monday + timedelta(days=4)
    inicio_semana = monday.strftime('%Y-%m-%d')
    fim_semana = friday.strftime('%Y-%m-%d')
    link_gravacao, link_geminidoc = '', ''
    for att in event.get('attachments', []):
        mime = att.get('mimeType', '')
        if ('video' in mime or 'mp4' in mime) and not link_gravacao:
            link_gravacao = att.get('fileUrl', '')
        if 'google-apps.document' in mime and not link_geminidoc:
            link_geminidoc = att.get('fileUrl', '')
    return dict(data=date_str, horario=time_str, mes=mes, semana=semana,
                inicio_semana=inicio_semana, fim_semana=fim_semana, ano=ano,
                link_gravacao=link_gravacao, link_geminidoc=link_geminidoc)

def match_fulltext(title_n, clientes):
    """Search the full normalized title for nome_empresa or nome_cliente matches."""
    if not title_n or len(title_n) < 5: return None
    # Try nome_empresa substring in title
    best, best_len = None, 0
    for c in clientes:
        ne = norm(c['nome_empresa'])
        if ne == 'n/a' or len(ne) < 4: continue
        if ne in title_n and len(ne) > best_len:
            best, best_len = c, len(ne)
    if best and best_len >= 6: return best
    # Try nome_cliente first+last in title
    for c in clientes:
        nc = norm(c['nome_cliente'])
        t = nc.split()
        if len(t) < 2: continue
        first, last = t[0], t[-1]
        if len(first) >= 3 and len(last) >= 3 and first in title_n and last in title_n:
            return c
    return None

results, unidentified = [], []
stats = dict(total=0, skipped_internal=0, identified=0, not_identified=0)
method_counts = {}

for event in events_all:
    summary = event.get('summary', '').strip()
    if not summary: continue
    if event.get('status') == 'cancelled': continue
    stats['total'] += 1
    if is_internal(summary):
        stats['skipped_internal'] += 1
        continue
    evt_data = extract_event_data(event)
    if not evt_data: continue
    empresa_raw, pessoa_raw = extract_from_title(summary)
    empresa_n, pessoa_n = norm(empresa_raw), norm(pessoa_raw)
    title_n = norm(summary)
    matched_client, match_method = None, None
    hc = check_hardcoded(title_n)
    if hc:
        for c in clientes:
            if c['codigo_cliente'] == hc:
                matched_client, match_method = c, 'hardcoded_alias'
                break
    if not matched_client:
        c = match_empresa_exact(empresa_n, clientes)
        if c: matched_client, match_method = c, 'titulo_empresa'
    if not matched_client:
        c = match_pessoa_exact(pessoa_n, clientes)
        if c: matched_client, match_method = c, 'titulo_pessoa'
    # Try swapped: empresa field as pessoa, pessoa field as empresa
    if not matched_client and empresa_n:
        c = match_pessoa_exact(empresa_n, clientes)
        if c: matched_client, match_method = c, 'titulo_pessoa_swap'
    if not matched_client and pessoa_n:
        c = match_empresa_exact(pessoa_n, clientes)
        if c: matched_client, match_method = c, 'titulo_empresa_swap'
    if not matched_client:
        c = match_empresa_fuzzy(empresa_n, clientes)
        if c: matched_client, match_method = c, 'titulo_empresa_fuzzy'
    if not matched_client:
        c = match_pessoa_como_empresa(pessoa_n, clientes)
        if c: matched_client, match_method = c, 'titulo_pessoa_como_empresa'
    # Fallback: search full title text against nome_empresa and nome_cliente
    if not matched_client:
        c = match_fulltext(title_n, clientes)
        if c: matched_client, match_method = c, 'titulo_fulltext'
    # Fallback: search pessoa text against nome_empresa (for embedded empresa in pessoa)
    if not matched_client:
        c = match_empresa_exact(pessoa_n, clientes)
        if c: matched_client, match_method = c, 'pessoa_como_empresa_exact'
    if not matched_client:
        c = match_empresa_fuzzy(pessoa_n, clientes)
        if c: matched_client, match_method = c, 'pessoa_como_empresa_fuzzy'
    record = dict(titulo_evento=summary, empresa_extraida=empresa_raw,
                  pessoa_extraida=pessoa_raw, **evt_data)
    if matched_client:
        stats['identified'] += 1
        method_counts[match_method] = method_counts.get(match_method, 0) + 1
        record.update(matched=True, match_method=match_method,
                      codigo_cliente=matched_client['codigo_cliente'],
                      nome_empresa_db=matched_client['nome_empresa'],
                      nome_cliente_db=matched_client['nome_cliente'],
                      id_cliente=matched_client['id_cliente'])
    else:
        stats['not_identified'] += 1
        record.update(matched=False, match_method=None, codigo_cliente=None,
                      nome_empresa_db=None, nome_cliente_db=None, id_cliente=None)
        unidentified.append(record)
    results.append(record)

results.sort(key=lambda r: r.get('data', ''))
with open('/tmp/galdino_matched.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print('=' * 70)
print('RELATORIO DE MATCHING - Rafael Galdino Calendar Events')
print('=' * 70)
ce = stats['total'] - stats['skipped_internal']
print()
print('Total events loaded:', stats['total'])
print('Internal/team events skipped:', stats['skipped_internal'])
print('Client events processed:', ce)
ident_pct = stats['identified']*100//max(ce,1)
nident_pct = stats['not_identified']*100//max(ce,1)
print('  Identified:', stats['identified'], '(' + str(ident_pct) + '%)')
print('  Not identified:', stats['not_identified'], '(' + str(nident_pct) + '%)')
print()
print('Breakdown by matching method:')
for method, count in sorted(method_counts.items(), key=lambda x: -x[1]):
    print('  ' + method + ':', count)
if unidentified:
    print()
    print('=' * 70)
    print('UNIDENTIFIED EVENTS (' + str(len(unidentified)) + '):')
    print('=' * 70)
    for u in unidentified:
        print('  [' + u['data'] + '] ' + u['titulo_evento'])
        print("    empresa: '" + u['empresa_extraida'] + "' | pessoa: '" + u['pessoa_extraida'] + "'")
print()
print('Results saved to /tmp/galdino_matched.json (' + str(len(results)) + ' records)')

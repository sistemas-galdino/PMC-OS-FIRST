#!/usr/bin/env bash
# =========================================================
# export_guardiao_seed.sh
# Reexporta o banco de perguntas do "Perfil do Guardiao" do Supabase VIVO
# da FONTE (projeto nzbbimjlqkdzxwxckwfc) e regenera o arquivo
# supabase-migrations/20260703_guardiao_seed.sql (INSERTs com UUIDs preservados,
# ON CONFLICT (id) DO NOTHING) para as tabelas guardiao_*.
#
# Uso:
#   ./supabase-migrations/scripts/export_guardiao_seed.sh
#
# Pre-requisitos:
#   - python3 no PATH
#   - .env da fonte em:
#       "Sistema para contratar ou escolher seu guardiao/.env"
#     com SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (chave anon; leitura publica
#     das tabelas assessments/questions/question_options).
#
# Seguro: so LE da fonte e ESCREVE o .sql local. Nao toca em nenhum banco do PMC.
# =========================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_ENV="$ROOT/Sistema para contratar ou escolher seu guardião/.env"
OUT_SQL="$ROOT/supabase-migrations/20260703_guardiao_seed.sql"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ ! -f "$SRC_ENV" ]]; then
  echo "ERRO: .env da fonte nao encontrado em: $SRC_ENV" >&2
  exit 1
fi

KEY="$(grep '^SUPABASE_PUBLISHABLE_KEY=' "$SRC_ENV" | cut -d'"' -f2)"
URL="$(grep '^SUPABASE_URL=' "$SRC_ENV" | cut -d'"' -f2)"
if [[ -z "$KEY" || -z "$URL" ]]; then
  echo "ERRO: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY ausentes no .env da fonte" >&2
  exit 1
fi

echo "Exportando de $URL ..."
curl -sf --max-time 60 "$URL/rest/v1/assessments?select=*&order=type" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o "$TMP/assessments.json"
curl -sf --max-time 60 "$URL/rest/v1/questions?select=*&order=assessment_id,order_index" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o "$TMP/questions.json"
curl -sf --max-time 60 "$URL/rest/v1/question_options?select=*&order=question_id,order_index" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o "$TMP/question_options.json"

OUT_SQL="$OUT_SQL" TMP="$TMP" python3 - <<'PYEOF'
import json, os
TMP=os.environ["TMP"]; OUT_SQL=os.environ["OUT_SQL"]
a=json.load(open(f"{TMP}/assessments.json"))
q=json.load(open(f"{TMP}/questions.json"))
o=json.load(open(f"{TMP}/question_options.json"))

def sq(v):
    return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
def num(v):
    return "NULL" if v is None else str(v)
def arr(tags):
    if not tags: return "'{}'"
    inner=",".join('"'+t.replace('"','\\"')+'"' for t in tags)
    return "'{"+inner+"}'"

L=[]
L.append("-- =========================================================")
L.append("-- SEED: banco de perguntas do Perfil do Guardiao (Fase 1)")
L.append("-- Exportado do Supabase VIVO da fonte (projeto nzbbimjlqkdzxwxckwfc)")
L.append("-- via PostgREST. UUIDs preservados p/ os FKs baterem.")
L.append("-- Conteudo: %d assessments, %d questions, %d question_options." % (len(a),len(q),len(o)))
L.append("-- Idempotente: ON CONFLICT (id) DO NOTHING. Ordem por dependencia.")
L.append("-- Regenerar: supabase-migrations/scripts/export_guardiao_seed.sh")
L.append("-- =========================================================")
L.append("")
L.append("BEGIN;")
L.append("")
L.append("-- 1) guardiao_assessments")
for r in a:
    L.append("INSERT INTO public.guardiao_assessments (id, type, title, description, version, created_at) VALUES ("
        f"{sq(r['id'])}, {sq(r['type'])}, {sq(r['title'])}, {sq(r['description'])}, {num(r['version'])}, {sq(r['created_at'])})"
        " ON CONFLICT (id) DO NOTHING;")
L.append("")
L.append("-- 2) guardiao_questions")
for r in q:
    L.append("INSERT INTO public.guardiao_questions (id, assessment_id, code, pillar, type, prompt, scenario_label, order_index, created_at) VALUES ("
        f"{sq(r['id'])}, {sq(r['assessment_id'])}, {sq(r['code'])}, {sq(r['pillar'])}, {sq(r['type'])}, {sq(r['prompt'])}, {sq(r['scenario_label'])}, {num(r['order_index'])}, {sq(r['created_at'])})"
        " ON CONFLICT (id) DO NOTHING;")
L.append("")
L.append("-- 3) guardiao_question_options")
for r in o:
    L.append("INSERT INTO public.guardiao_question_options (id, question_id, letter, label, points, disc_tags, order_index) VALUES ("
        f"{sq(r['id'])}, {sq(r['question_id'])}, {sq(r['letter'])}, {sq(r['label'])}, {num(r['points'])}, {arr(r['disc_tags'])}, {num(r['order_index'])})"
        " ON CONFLICT (id) DO NOTHING;")
L.append("")
L.append("COMMIT;")
L.append("")
open(OUT_SQL,"w").write("\n".join(L))
print("OK -> %s  (%d assessments, %d questions, %d options)" % (OUT_SQL, len(a), len(q), len(o)))
PYEOF

echo "Pronto."

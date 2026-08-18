#!/usr/bin/env python3
"""
Gera o SQL de importação do acervo da Vitrine de Cases para as tabelas vitrine_*.

Por que gerar SQL em vez de escrever direto pelo supabase-js: não há SECRET_KEY
(service role) no ambiente local, e o SQL sai idêntico para DEV e PROD — o que
garante que os dois ambientes fiquem com exatamente o mesmo acervo.

O vínculo com o cliente real:
  O `external_client_id` do sistema antigo É o `clientes_entrada_new.id_cliente`
  do PMC OS (a base da vitrine saiu de um export do PMC OS). 81 dos 84 clientes
  casam direto por uuid. Os 3 restantes usavam slug em vez de uuid e são
  resolvidos aqui na mão (VINCULO_MANUAL) ou ficam 'pendente' pra ser resolvido
  na tela.

Uso:
  python3 scripts/vitrine/gerar-import.py <saida.sql>
"""
import json, re, sys
from pathlib import Path

BK = Path("/Users/davidabn/cases-pmc/vitrine-cases-clientes-pmc/backups/2026-08-17T00-46-12")
MAPA = Path("/private/tmp/claude-501/-Users-davidabn-pmc-os-vitrini-cases/125418c1-1e81-4490-8a3e-2c97a477b074/scratchpad/mapa_uuid_codigo.txt")

# Os 3 clientes que o sistema antigo salvou com slug em vez do uuid do PMC OS.
# Resolvidos por nome contra clientes_entrada_new (PROD).
VINCULO_MANUAL = {
    "LINE-ATUADORES": ("ce865640-80d0-472f-bb77-df61450cee6a", 307, "nome_empresa"),
}
# Ambíguos/sem correspondência: entram como 'pendente' e são resolvidos na tela.
PENDENTES = {
    "DROGARIA-ULTRA-POPULAR": "2 cadastros no PMC OS: 369 (Drogaria Ultra Popular) e 380 (Drogarias Ultra Popular)",
    "C3": "sem correspondência em clientes_entrada_new",
}

SENTINELA = {"PENDENTE_VALIDACAO", "N/A", "NA", "", "Sem site"}


def limpo(v):
    """PENDENTE_VALIDACAO é marcador interno do sistema antigo — nunca pode
    chegar na tela, então vira NULL já na entrada."""
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if v in SENTINELA:
            return None
    return v


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def qarr(v):
    """text[] a partir de lista ou de string separada por ' | ' (formato do legado)."""
    if v is None:
        return "'{}'"
    if isinstance(v, str):
        v = [p.strip() for p in re.split(r"\s*\|\s*|\n", v)]
    itens = [limpo(x) for x in v if limpo(x)]
    if not itens:
        return "'{}'"
    return "ARRAY[" + ",".join(q(i) for i in itens) + "]::text[]"


def logo_publica(path):
    """As 59 logos do legado viram arquivos estáticos em web/public/vitrine-logos/.
    Caminho começando com '/' = arquivo local; qualquer outro = objeto no bucket
    vitrine-logos (é assim que o front resolve). Mesma convenção do sistema antigo."""
    if not path:
        return None
    return "/vitrine-logos/" + path.split("/")[-1]


def main(saida):
    mapa = {}
    for par in MAPA.read_text().strip().split(","):
        u, c = par.split("=")
        mapa[u.strip()] = int(c)

    clients = json.load(open(BK / "clients.json"))
    victories = json.load(open(BK / "victories.json"))

    linhas = ["-- GERADO por scripts/vitrine/gerar-import.py — não editar à mão.",
              "-- Importação idempotente (ON CONFLICT em origem_legado_uuid / case_id).",
              "BEGIN;", ""]

    stats = {"vinculado": 0, "pendente": 0}
    por_origem = {}

    # ---------- vitrine_clientes ----------
    for c in clients:
        origem = c["external_client_id"]
        id_cliente = codigo = metodo = candidatos = None
        if origem in mapa:
            id_cliente, codigo, metodo = origem, mapa[origem], "uuid_legado"
        elif origem in VINCULO_MANUAL:
            id_cliente, codigo, metodo = VINCULO_MANUAL[origem]
        else:
            candidatos = PENDENTES.get(origem)
        status = "vinculado" if id_cliente else "pendente"
        stats[status] += 1
        por_origem[origem] = (id_cliente, codigo, limpo(c.get("company_name")))

        linhas.append(
            "INSERT INTO public.vitrine_clientes "
            "(id_cliente, codigo_cliente, empresa_nome, cliente_nome, nicho, subnicho, "
            "cs_responsavel, consultor_responsavel, site, instagram, logo_path, "
            "logo_display_path, logo_status, logo_origem, vinculo_status, vinculo_metodo, "
            "vinculo_candidatos, status_cliente, observacoes, origem_legado_uuid) VALUES ("
            + ",".join([
                q(id_cliente), q(codigo), q(limpo(c.get("company_name")) or "(sem nome)"),
                q(limpo(c.get("client_name"))), q(limpo(c.get("niche"))), q(limpo(c.get("subniche"))),
                q(limpo(c.get("cs_responsible"))), q(limpo(c.get("consultant_responsible"))),
                q(limpo(c.get("website"))), q(limpo(c.get("instagram"))),
                q(logo_publica(limpo(c.get("logo_path")))),
                q(logo_publica(limpo(c.get("logo_display_path")))),
                q(limpo(c.get("logo_status")) or "pendente"), q(limpo(c.get("logo_source"))),
                q(status), q(metodo), q(candidatos), q(limpo(c.get("client_status"))),
                q(limpo(c.get("notes"))), q(origem),
            ])
            + ") ON CONFLICT (origem_legado_uuid) DO UPDATE SET "
            "id_cliente=excluded.id_cliente, codigo_cliente=excluded.codigo_cliente, "
            "empresa_nome=excluded.empresa_nome, cliente_nome=excluded.cliente_nome, "
            "nicho=excluded.nicho, subnicho=excluded.subnicho, "
            "cs_responsavel=excluded.cs_responsavel, consultor_responsavel=excluded.consultor_responsavel, "
            "site=excluded.site, instagram=excluded.instagram, "
            "vinculo_status=excluded.vinculo_status, vinculo_metodo=excluded.vinculo_metodo, "
            "vinculo_candidatos=excluded.vinculo_candidatos, status_cliente=excluded.status_cliente;"
        )

    # clients.id (uuid interno do legado) -> external_client_id, pra ligar as vitórias
    id_para_origem = {c["id"]: c["external_client_id"] for c in clients}

    linhas.append("")
    # ---------- vitrine_cases ----------
    orfas = 0
    for v in victories:
        origem_cli = id_para_origem.get(v["client_id"])
        if not origem_cli:
            orfas += 1
            continue
        id_cliente, codigo, empresa = por_origem[origem_cli]
        linhas.append(
            "INSERT INTO public.vitrine_cases "
            "(case_id, vitrine_cliente_id, id_cliente, codigo_cliente, empresa_nome, "
            "headline_impacto, headline_vitrine, headline_curta, categoria, foco_ia, "
            "ferramenta_card, ferramenta_ia, resumo_executivo, como_era_antes, "
            "principais_gargalos, como_ficou_depois, o_que_pmc_transformou, principais_ganhos, "
            "solucao_criada, processo_atual, resultado_principal, status_implementacao, "
            "status_publicacao, status_validacao, nivel_evidencia, aprovado_vitrine, destaque, "
            "ordem_vitrine, arquivado, capa_url, palavras_chave, observacoes, origem_legado_uuid) "
            "SELECT " + ",".join([
                q(v["case_id"]), "vc.id", q(id_cliente), q(codigo), q(empresa),
                q(limpo(v.get("impact_headline"))), q(limpo(v.get("showcase_headline"))),
                q(limpo(v.get("short_headline"))), q(limpo(v.get("category"))),
                q(bool(v.get("ai_focus"))), q(limpo(v.get("card_tool"))), q(limpo(v.get("ai_tool"))),
                q(limpo(v.get("executive_summary"))), q(limpo(v.get("before_scenario"))),
                qarr(v.get("main_bottlenecks")), q(limpo(v.get("after_scenario"))),
                q(limpo(v.get("pmc_transformation"))), qarr(v.get("main_gains")),
                q(limpo(v.get("solution_created"))), q(limpo(v.get("current_process"))),
                q(limpo(v.get("main_result"))), q(limpo(v.get("implementation_status"))),
                q(limpo(v.get("publication_status")) or "nao_publicado"),
                q(limpo(v.get("validation_status"))), q(limpo(v.get("evidence_level"))),
                q(bool(v.get("approved_for_showcase"))), q(bool(v.get("is_featured"))),
                q(v.get("showcase_order")), q(bool(v.get("is_archived"))),
                q(limpo(v.get("cover_image_url"))), qarr(v.get("keywords")),
                q(limpo(v.get("notes"))), q(v["id"]),
            ])
            + " FROM public.vitrine_clientes vc WHERE vc.origem_legado_uuid = " + q(origem_cli)
            + " ON CONFLICT (case_id) DO UPDATE SET "
            "headline_impacto=excluded.headline_impacto, headline_vitrine=excluded.headline_vitrine, "
            "categoria=excluded.categoria, foco_ia=excluded.foco_ia, "
            "ferramenta_card=excluded.ferramenta_card, resumo_executivo=excluded.resumo_executivo, "
            "como_era_antes=excluded.como_era_antes, principais_gargalos=excluded.principais_gargalos, "
            "como_ficou_depois=excluded.como_ficou_depois, "
            "o_que_pmc_transformou=excluded.o_que_pmc_transformou, "
            "principais_ganhos=excluded.principais_ganhos, solucao_criada=excluded.solucao_criada, "
            "processo_atual=excluded.processo_atual, resultado_principal=excluded.resultado_principal, "
            "id_cliente=excluded.id_cliente, codigo_cliente=excluded.codigo_cliente, "
            "empresa_nome=excluded.empresa_nome, ordem_vitrine=excluded.ordem_vitrine;"
        )

    linhas += ["", "COMMIT;"]
    Path(saida).write_text("\n".join(linhas))

    print(f"clientes: {len(clients)} (vinculados {stats['vinculado']}, pendentes {stats['pendente']})")
    print(f"cases: {len(victories) - orfas}" + (f" ({orfas} órfãs ignoradas)" if orfas else ""))
    print(f"SQL: {saida} ({Path(saida).stat().st_size} bytes)")


if __name__ == "__main__":
    main(sys.argv[1])

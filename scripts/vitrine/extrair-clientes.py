import json, re, sys, unicodedata
BK = "/Users/davidabn/cases-pmc/vitrine-cases-clientes-pmc/backups/2026-08-17T00-46-12"
clients = json.load(open(f"{BK}/clients.json"))

def codigo_do_logo(*paths):
    """O sistema antigo nomeava a logo com o código do cliente do PMC: 161-dionizio-...png.
    É o único identificador externo que sobrou no backup (não há e-mail/CNPJ/código)."""
    for p in paths:
        if not p: continue
        base = p.split("/")[-1]
        m = re.match(r"^(\d{2,4})-", base)
        if m: return int(m.group(1))
    return None

out = []
for c in clients:
    out.append({
        "origem_uuid": c["external_client_id"],
        "empresa": c.get("company_name"),
        "pessoa": c.get("client_name"),
        "codigo_logo": codigo_do_logo(c.get("logo_path"), c.get("logo_display_path")),
    })
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
com = sum(1 for o in out if o["codigo_logo"])
print(f"{len(out)} clientes | {com} com código na logo")

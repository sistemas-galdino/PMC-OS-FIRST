-- Inteligência de Gargalos por Nicho — Onda 1: fundação e anonimato.
--
-- A ideia: o Método aprende com todos os gargalos mapeados, agrupa por nicho e
-- devolve para cada empresa os gargalos mais recorrentes do setor dela — sem
-- que nenhum dado de nenhuma empresa atravesse a fronteira do inquilino.
--
-- A fronteira é desenhada assim:
--   · o texto que a empresa escreve NUNCA sai de metodo_gargalos (RLS por cliente);
--   · o que atravessa é só a ASSINATURA (um rótulo canônico do catálogo);
--   · a tabela publicada (gargalo_nicho_stats) não tem id_cliente, não tem texto
--     livre e só recebe uma linha quando um número mínimo de empresas distintas
--     do nicho tiver aquela assinatura (k-anonimato);
--   · a função que agrega é SECURITY DEFINER e fica REVOKED do cliente: quem
--     lê o cru é o job, não o usuário.

-- ---------------------------------------------------------------------------
-- 1. Taxonomia de nicho
-- ---------------------------------------------------------------------------

create table if not exists nichos_padrao (
  nicho text primary key,
  ordem int not null default 100
);

insert into nichos_padrao (nicho, ordem) values
  ('Agronegócio', 1), ('Alimentação e Bebidas', 2), ('Automotivo', 3),
  ('Beleza e Estética', 4), ('Construção Civil', 5), ('Consultoria', 6),
  ('E-commerce', 7), ('Educação', 8), ('Energia', 9), ('Engenharia', 10),
  ('Entretenimento', 11), ('Finanças', 12), ('Imobiliário', 13), ('Indústria', 14),
  ('Jurídico', 15), ('Logística', 16), ('Marketing e Publicidade', 17), ('Moda', 18),
  ('Pet', 19), ('Saúde', 20), ('Serviços', 21), ('Tecnologia', 22),
  ('Turismo', 23), ('Varejo', 24), ('Outro', 99)
on conflict (nicho) do update set ordem = excluded.ordem;

-- De-para do que já está gravado. O cadastro sempre foi texto livre, então há
-- 74 variações para 25 nichos reais ("Farmacia " e "Farmácia / Drogaria /
-- Manipulação" são o mesmo setor). A chave é o texto já em minúsculas e sem
-- espaços nas pontas — é assim que nicho_canonico() consulta.
create table if not exists nicho_depara (
  bruto text primary key,
  nicho text not null references nichos_padrao(nicho)
);

insert into nicho_depara (bruto, nicho) values
  ('saúde', 'Saúde'),
  ('saúde e bem-estar (clínica médica)', 'Saúde'),
  ('saúde e clínicas médicas', 'Saúde'),
  ('odontologia', 'Saúde'),
  ('laboratorio', 'Saúde'),
  ('rede de academias', 'Saúde'),
  ('farmácia / drogaria / manipulação', 'Saúde'),
  ('farmacia', 'Saúde'),
  ('indústria', 'Indústria'),
  ('agronegócio / indústria', 'Indústria'),
  ('setor industrial e construção civil', 'Indústria'),
  ('tintas industriais, marítimas e automotivas', 'Indústria'),
  ('consultoria & mentoria empresarial', 'Consultoria'),
  ('consultoria e mnetoria', 'Consultoria'),
  ('consultoria financeira e investimentos', 'Consultoria'),
  ('contabilidade / tributário', 'Consultoria'),
  ('segurança do trabalho', 'Consultoria'),
  ('alimentação, hotelaria & turismo', 'Alimentação e Bebidas'),
  ('alimentação e bebidas', 'Alimentação e Bebidas'),
  ('alimentação e bebidas (atacado)', 'Alimentação e Bebidas'),
  ('alimentos e bebidas', 'Alimentação e Bebidas'),
  ('varejo & e-commerce', 'Varejo'),
  ('varejo', 'Varejo'),
  ('varejo e atacado', 'Varejo'),
  ('supermercados & atacarejo', 'Varejo'),
  ('móveis e decoração', 'Varejo'),
  ('loja de planejados', 'Varejo'),
  ('artigos esportivos e lazer', 'Varejo'),
  ('distribuição e venda b2b', 'Varejo'),
  ('e-commerce', 'E-commerce'),
  ('arquitetura, engenharia & construção', 'Construção Civil'),
  ('construtora', 'Construção Civil'),
  ('construção', 'Construção Civil'),
  ('construção civil', 'Construção Civil'),
  ('construção pesada/infraestrutura (terraplanagem, pavimentação e hidrossemeadura), locação de máquinas e saúde/fitness (crossfit)', 'Construção Civil'),
  ('educação & treinamentos', 'Educação'),
  ('educação', 'Educação'),
  ('educação corporativa e desenvolvimento humano', 'Educação'),
  ('tecnologia & telecom', 'Tecnologia'),
  ('tecnologia', 'Tecnologia'),
  ('tecnologia / software (saas)', 'Tecnologia'),
  ('agronegócio', 'Agronegócio'),
  ('transporte e comércio de madeira', 'Agronegócio'),
  ('imobiliário (construtoras, investimento imobiliário e incorporadoras / urbanismo)', 'Imobiliário'),
  ('imobiliário (corretagem, incorporadora, urbanismo)', 'Imobiliário'),
  ('vendas de imoveis', 'Imobiliário'),
  ('empresa de síndicos e condomínios', 'Imobiliário'),
  ('serviços profissionais (seguros, corretora/consórcio)', 'Finanças'),
  ('serviços financeiros', 'Finanças'),
  ('consórcio', 'Finanças'),
  ('consórcios', 'Finanças'),
  ('advocacia', 'Jurídico'),
  ('automotivo (concessionárias, revendas, pneus, serviços)', 'Automotivo'),
  ('centro automotivo', 'Automotivo'),
  ('comércio automotivo', 'Automotivo'),
  ('venda de motos', 'Automotivo'),
  ('importação e distribuição de peças', 'Automotivo'),
  ('beleza', 'Beleza e Estética'),
  ('moda e beleza', 'Beleza e Estética'),
  ('moda masculina', 'Moda'),
  ('confecção  de roupas', 'Moda'),
  ('agência & marketing', 'Marketing e Publicidade'),
  ('agência de marketing', 'Marketing e Publicidade'),
  ('logística, transportes & despachantes', 'Logística'),
  ('transportes', 'Logística'),
  ('energia', 'Energia'),
  ('energia (solar, geradores)', 'Energia'),
  ('turismo e entretenimento', 'Turismo'),
  ('hospedagem', 'Turismo'),
  ('serviços', 'Serviços'),
  ('n/a', 'Outro'),
  ('outro', 'Outro')
on conflict (bruto) do update set nicho = excluded.nicho;

-- Texto livre -> nicho da taxonomia. Tenta o de-para, depois o nome exato de um
-- nicho-padrão, e só então desiste em 'Outro'.
create or replace function nicho_canonico(bruto text)
returns text
language sql
stable
as $$
  select coalesce(
    (select d.nicho from nicho_depara d where d.bruto = lower(btrim($1))),
    (select n.nicho from nichos_padrao n where lower(n.nicho) = lower(btrim($1))),
    'Outro'
  )
$$;

-- Nicho de um cliente. A entrada é a fonte principal; o formulário e o
-- onboarding cobrem quem entrou por outro caminho.
create or replace function nicho_do_cliente(cid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nicho_canonico(coalesce(
    (select e.nicho from clientes_entrada_new e where e.id_cliente = cid and btrim(coalesce(e.nicho, '')) <> '' limit 1),
    (select f.nicho from clientes_formulario f where f.id_cliente = cid and btrim(coalesce(f.nicho, '')) <> '' limit 1),
    (select o.nicho from cliente_onboarding o where o.id_cliente = cid and btrim(coalesce(o.nicho, '')) <> '' limit 1)
  ))
$$;

-- ---------------------------------------------------------------------------
-- 2. Catálogo de assinaturas — o vocabulário comum entre empresas
-- ---------------------------------------------------------------------------
-- Sem isto não existe contagem: cada empresa escreve o mesmo gargalo com um
-- nome diferente. A assinatura é o rótulo canônico ao qual a IA encaixa o texto.

create table if not exists gargalos_assinaturas (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,               -- slug estável, ex.: proposta-comercial-manual
  titulo text not null,
  descricao text,
  area_sugerida text,                       -- área típica (Comercial, Financeiro...)
  impactos_sugeridos text[] not null default '{}',
  ferramentas_tipicas text[] not null default '{}',
  horas_mes_tipicas numeric,                -- referência usada enquanto não há dado real
  nichos_alvo text[] not null default '{}', -- vazio = vale para qualquer nicho
  -- 'curado' = escrito pelo time · 'referencia' = gerado por IA e aprovado
  -- 'emergente' = a IA viu um padrão novo no texto dos clientes e propôs
  origem text not null default 'curado',
  aprovado boolean not null default false,  -- só entra em produção depois da curadoria
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gargalos_assinaturas_origem_check
    check (origem in ('curado', 'referencia', 'emergente'))
);

-- A classificação do gargalo da empresa. Fica DENTRO do inquilino: é o único
-- ponto de contato entre o texto privado e o vocabulário compartilhado.
alter table metodo_gargalos
  add column if not exists assinatura_id uuid references gargalos_assinaturas(id) on delete set null,
  -- Quando o gargalo nasceu de uma sugestão do nicho, guarda a origem: é o que
  -- permite medir se a sugestão acertou.
  add column if not exists sugerido_de uuid references gargalos_assinaturas(id) on delete set null;

create index if not exists metodo_gargalos_assinatura_idx on metodo_gargalos (assinatura_id);

-- Sugestão que a empresa dispensou ("isso não acontece aqui"). Privado por
-- cliente; serve para não insistir e, no agregado, para calibrar o ranking.
create table if not exists gargalo_sugestao_descartada (
  id_cliente uuid not null,
  assinatura_id uuid not null references gargalos_assinaturas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (id_cliente, assinatura_id)
);

-- ---------------------------------------------------------------------------
-- 3. Tabela publicada — o que a empresa enxerga do coletivo
-- ---------------------------------------------------------------------------
-- Sem id_cliente e sem texto livre, de propósito: é o contrato de privacidade
-- expresso no schema, não só na consulta.

create table if not exists gargalo_nicho_stats (
  nicho text not null references nichos_padrao(nicho),
  assinatura_id uuid not null references gargalos_assinaturas(id) on delete cascade,
  empresas int not null default 0,          -- quantas empresas distintas do nicho têm
  empresas_no_nicho int not null default 0, -- base de comparação (o denominador)
  aderencia numeric,                        -- % arredondado, nunca fração exata
  horas_mes_mediana numeric,
  prioridade_pct numeric,
  horas_recuperadas_mediana numeric,        -- de quem já resolveu
  -- 'dado_real' = veio do que as empresas mapearam (passou pelo k-anonimato)
  -- 'referencia' = catálogo do Método, usado enquanto o nicho não tem massa
  origem text not null default 'dado_real',
  atualizado_em timestamptz not null default now(),
  primary key (nicho, assinatura_id),
  constraint gargalo_nicho_stats_origem_check check (origem in ('dado_real', 'referencia'))
);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table nichos_padrao enable row level security;
alter table nicho_depara enable row level security;
alter table gargalos_assinaturas enable row level security;
alter table gargalo_nicho_stats enable row level security;
alter table gargalo_sugestao_descartada enable row level security;

drop policy if exists nichos_padrao_leitura on nichos_padrao;
create policy nichos_padrao_leitura on nichos_padrao for select to authenticated using (true);
drop policy if exists nichos_padrao_admin on nichos_padrao;
create policy nichos_padrao_admin on nichos_padrao for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists nicho_depara_leitura on nicho_depara;
create policy nicho_depara_leitura on nicho_depara for select to authenticated using (true);
drop policy if exists nicho_depara_admin on nicho_depara;
create policy nicho_depara_admin on nicho_depara for all to authenticated using (is_admin()) with check (is_admin());

-- O cliente só enxerga assinatura aprovada. As propostas da IA aguardando
-- curadoria são visíveis apenas para o time.
drop policy if exists assinaturas_leitura on gargalos_assinaturas;
create policy assinaturas_leitura on gargalos_assinaturas
  for select to authenticated using (aprovado or is_admin());
drop policy if exists assinaturas_admin on gargalos_assinaturas;
create policy assinaturas_admin on gargalos_assinaturas
  for all to authenticated using (is_admin()) with check (is_admin());

-- O agregado é legível por qualquer cliente: é justamente o produto. A proteção
-- está em como a linha é criada (k-anonimato), não em quem lê.
drop policy if exists stats_leitura on gargalo_nicho_stats;
create policy stats_leitura on gargalo_nicho_stats for select to authenticated using (true);
drop policy if exists stats_admin on gargalo_nicho_stats;
create policy stats_admin on gargalo_nicho_stats
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists descartada_do_cliente on gargalo_sugestao_descartada;
create policy descartada_do_cliente on gargalo_sugestao_descartada
  for all to authenticated
  using (id_cliente = meu_id_cliente() or is_admin())
  with check (id_cliente = meu_id_cliente() or is_admin());

-- ---------------------------------------------------------------------------
-- 5. Agregação com k-anonimato
-- ---------------------------------------------------------------------------
-- Roda no job, não no pedido do usuário. Dois limites:
--   k_min          — mínimo de empresas do nicho com aquela assinatura;
--   base_min       — mínimo de empresas do nicho com QUALQUER gargalo mapeado.
-- O segundo existe porque, num nicho de 5 empresas onde as 5 têm o gargalo,
-- "100% do seu nicho tem isso" identifica os concorrentes. Com uma base maior,
-- a porcentagem deixa de apontar para alguém.

create or replace function recomputar_gargalos_nicho(k_min int default 5, base_min int default 8)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  linhas int;
begin
  -- Um gargalo por empresa por assinatura: a mesma empresa mapeando o processo
  -- duas vezes não pode contar como duas empresas.
  create temp table _base on commit drop as
  select
    nicho_do_cliente(g.id_cliente) as nicho,
    g.assinatura_id,
    g.id_cliente,
    max(coalesce(g.horas_mes, 0))                                    as horas_mes,
    bool_or(g.prioridade)                                            as prioridade,
    max(case when g.status = 'resolvido'
             then greatest(0, coalesce(g.horas_mes, 0) - coalesce((g.resultado->>'horas_depois')::numeric, coalesce(g.horas_mes, 0)))
        end)                                                         as horas_recuperadas
  from metodo_gargalos g
  where g.assinatura_id is not null
  group by 1, 2, 3;

  -- Denominador = empresas do nicho que mapearam ALGUM gargalo classificado.
  -- Não é o total de clientes do nicho: quem nunca mapeou nada não pode ser
  -- contado como "não tem esse gargalo". Por isso a leitura correta é
  -- "X% das empresas do nicho que mapearam gargalos".
  create temp table _denominador on commit drop as
  select nicho, count(distinct id_cliente) as empresas_no_nicho
  from _base group by nicho;

  delete from gargalo_nicho_stats where origem = 'dado_real';

  insert into gargalo_nicho_stats (
    nicho, assinatura_id, empresas, empresas_no_nicho, aderencia,
    horas_mes_mediana, prioridade_pct, horas_recuperadas_mediana, origem, atualizado_em
  )
  select
    b.nicho,
    b.assinatura_id,
    count(*)                                                          as empresas,
    d.empresas_no_nicho,
    -- Arredondado em passos de 5 pontos: uma porcentagem exata em base pequena
    -- também é um identificador.
    round(count(*)::numeric * 100 / d.empresas_no_nicho / 5) * 5      as aderencia,
    round(percentile_cont(0.5) within group (order by b.horas_mes)::numeric, 1) as horas_mes_mediana,
    round(count(*) filter (where b.prioridade)::numeric * 100 / count(*) / 5) * 5 as prioridade_pct,
    round(percentile_cont(0.5) within group (order by b.horas_recuperadas)::numeric, 1) as horas_recuperadas_mediana,
    'dado_real',
    now()
  from _base b
  join _denominador d on d.nicho = b.nicho
  group by b.nicho, b.assinatura_id, d.empresas_no_nicho
  having count(*) >= k_min and d.empresas_no_nicho >= base_min;

  get diagnostics linhas = row_count;
  return linhas;
end;
$$;

-- Só o job (postgres/service_role) agrega. Um cliente chamando isto estaria
-- lendo metodo_gargalos de todo mundo através da SECURITY DEFINER.
revoke all on function recomputar_gargalos_nicho(int, int) from public, anon, authenticated;

-- Recompute diário, 09:20 UTC (06:20 BRT) — antes do digest da manhã.
select cron.unschedule('recomputar-gargalos-nicho')
  where exists (select 1 from cron.job where jobname = 'recomputar-gargalos-nicho');
select cron.schedule(
  'recomputar-gargalos-nicho',
  '20 9 * * *',
  $cron$ select recomputar_gargalos_nicho(); $cron$
);

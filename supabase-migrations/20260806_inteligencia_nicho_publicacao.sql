-- Inteligência de Gargalos por Nicho — Onda 2: publicação e operação.
--
-- Completa a Onda 1 com:
--   · publicar_referencias_nicho()  — o catálogo APROVADO vira sugestão nos
--     nichos que ainda não têm massa de dado real (resolve a partida a frio);
--   · atualizar_inteligencia_nicho() — o job: mede primeiro, completa depois;
--   · republicar_inteligencia_nicho() — atalho do time, com checagem própria;
--   · a seção de RBAC da tela de curadoria.

-- Publica o catálogo aprovado como sugestão de referência. Só entra onde NÃO
-- existe dado real: o número medido sempre ganha da estimativa.
create or replace function publicar_referencias_nicho()
returns int language plpgsql security definer set search_path = public as $$
declare linhas int;
begin
  delete from gargalo_nicho_stats where origem = 'referencia';

  insert into gargalo_nicho_stats (
    nicho, assinatura_id, empresas, empresas_no_nicho, aderencia,
    horas_mes_mediana, prioridade_pct, horas_recuperadas_mediana, origem, atualizado_em)
  select n.nicho, a.id, 0, 0, null, a.horas_mes_tipicas, null, null, 'referencia', now()
  from gargalos_assinaturas a
  join nichos_padrao n
    -- nichos_alvo vazio = assinatura que vale para qualquer nicho
    on a.nichos_alvo = '{}'::text[] or n.nicho = any(a.nichos_alvo)
  where a.aprovado
    and not exists (
      select 1 from gargalo_nicho_stats s
      where s.nicho = n.nicho and s.assinatura_id = a.id and s.origem = 'dado_real'
    );

  get diagnostics linhas = row_count;
  return linhas;
end;
$$;

revoke all on function publicar_referencias_nicho() from public, anon, authenticated;

-- A ordem importa: mede o dado real primeiro, completa com referência depois —
-- é o que garante que a estimativa nunca sobrescreva o que foi medido.
create or replace function atualizar_inteligencia_nicho()
returns text language plpgsql security definer set search_path = public as $$
declare reais int; refs int;
begin
  reais := recomputar_gargalos_nicho();
  refs  := publicar_referencias_nicho();
  return format('dado_real=%s referencia=%s', reais, refs);
end;
$$;

revoke all on function atualizar_inteligencia_nicho() from public, anon, authenticated;

-- Atalho para o time republicar sem esperar o job. A agregação continua
-- revogada do cliente; este wrapper é o único caminho e checa is_admin().
create or replace function republicar_inteligencia_nicho()
returns text language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'apenas o time pode republicar a inteligência de nicho';
  end if;
  return atualizar_inteligencia_nicho();
end;
$$;

revoke all on function republicar_inteligencia_nicho() from public, anon;
grant execute on function republicar_inteligencia_nicho() to authenticated;

-- O job diário passa a rodar as duas etapas.
select cron.unschedule('recomputar-gargalos-nicho')
  where exists (select 1 from cron.job where jobname = 'recomputar-gargalos-nicho');
select cron.unschedule('atualizar-inteligencia-nicho')
  where exists (select 1 from cron.job where jobname = 'atualizar-inteligencia-nicho');
select cron.schedule(
  'atualizar-inteligencia-nicho',
  '20 9 * * *',
  $cron$ select atualizar_inteligencia_nicho(); $cron$
);

-- Seção da tela de curadoria no RBAC do time.
insert into secoes_catalogo (chave, label, grupo, ordem)
values ('inteligencia-nicho', 'Inteligência de Nicho', 'Sistema', 945)
on conflict (chave) do update
  set label = excluded.label, grupo = excluded.grupo, ordem = excluded.ordem;

-- ---------------------------------------------------------------------------
-- Registro de assinaturas com MERGE de nichos.
--
-- Correção de um furo encontrado no primeiro teste real: a edge function usava
-- upsert com ignoreDuplicates, então quando o mesmo gargalo aparecia num
-- segundo nicho (pagamentos manuais existe em Saúde E em Agronegócio), a linha
-- era simplesmente descartada — e o nicho novo NUNCA entrava em nichos_alvo.
-- Na prática: o segundo nicho ficava sem aquela sugestão para sempre.
--
-- Aqui a chave repetida amplia o alcance, sem tocar no texto já curado.
create or replace function registrar_assinaturas(itens jsonb, p_origem text)
returns int language plpgsql security definer set search_path = public as $$
declare linhas int;
begin
  if p_origem not in ('curado','referencia','emergente') then
    raise exception 'origem inválida: %', p_origem;
  end if;

  insert into gargalos_assinaturas (
    chave, titulo, descricao, area_sugerida, impactos_sugeridos,
    ferramentas_tipicas, horas_mes_tipicas, nichos_alvo, origem, aprovado)
  select
    i->>'chave',
    i->>'titulo',
    nullif(i->>'descricao',''),
    nullif(i->>'area_sugerida',''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(i->'impactos_sugeridos') x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(i->'ferramentas_tipicas') x), '{}'),
    nullif(i->>'horas_mes_tipicas','')::numeric,
    coalesce((select array_agg(x) from jsonb_array_elements_text(i->'nichos_alvo') x), '{}'),
    p_origem,
    false
  from jsonb_array_elements(itens) i
  where coalesce(i->>'chave','') <> '' and coalesce(i->>'titulo','') <> ''
  on conflict (chave) do update set
    -- A proteção é da CURADORIA, não do rascunho: o que já foi APROVADO é
    -- intocável; o que ainda está pendente é rascunho da IA e pode ser
    -- substituído por uma geração nova. Sem esta distinção, regerar um nicho
    -- não corrige nada — foi exatamente o que aconteceu no primeiro teste.
    titulo = case when gargalos_assinaturas.aprovado then gargalos_assinaturas.titulo else excluded.titulo end,
    descricao = case when gargalos_assinaturas.aprovado then gargalos_assinaturas.descricao else excluded.descricao end,
    area_sugerida = case when gargalos_assinaturas.aprovado then gargalos_assinaturas.area_sugerida else excluded.area_sugerida end,
    impactos_sugeridos = case when gargalos_assinaturas.aprovado then gargalos_assinaturas.impactos_sugeridos else excluded.impactos_sugeridos end,
    ferramentas_tipicas = case when gargalos_assinaturas.aprovado then gargalos_assinaturas.ferramentas_tipicas else excluded.ferramentas_tipicas end,
    horas_mes_tipicas = case when gargalos_assinaturas.aprovado then gargalos_assinaturas.horas_mes_tipicas else excluded.horas_mes_tipicas end,
    -- O alcance sempre soma, aprovada ou não: ampliar nicho nunca desfaz curadoria.
    nichos_alvo = case
      -- '{}' significa "vale para todos"; uma vez universal, continua universal
      when gargalos_assinaturas.nichos_alvo = '{}'::text[] then '{}'::text[]
      when excluded.nichos_alvo = '{}'::text[] then '{}'::text[]
      else (select array(
        select distinct unnest(gargalos_assinaturas.nichos_alvo || excluded.nichos_alvo) order by 1
      ))
    end,
    updated_at = now();

  get diagnostics linhas = row_count;
  return linhas;
end;
$$;

revoke all on function registrar_assinaturas(jsonb, text) from public, anon, authenticated;

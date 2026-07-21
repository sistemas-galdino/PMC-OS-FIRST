-- 20260722_security_rbac_hardening.sql
-- Fecha buracos de segurança do RBAC/multiusuário (commit 745f3fe), achados na auditoria:
--  1.1 auto-promoção a super_admin via API (mentores.papel só barrado no front)
--  1.2 empresa_usuarios gravável por qualquer membro -> vazamento cross-tenant
--  1.3 membro limitado lendo PII de todos os clientes (RBAC só escondia o menu)
--  1.5 funções SECURITY DEFINER executáveis por anon (enumeração/IDOR)
--  1.6 safe_ddmmyyyy sem search_path fixo
-- (1.4 — travar o UPDATE do próprio cliente por whitelist — ADIADO: o cliente grava
--  status_atual/pais na ativação; precisa mapear o fluxo de onboarding antes p/ não quebrá-lo.)

-- 1.1 — Proteção de mentores.papel: só super_admin altera/cria papel privilegiado;
--       valida o papel; protege o "último super admin". Bypassa a checagem de escalonamento
--       quando a chamada é service_role (a edge provisionar-login faz sua própria checagem).
create or replace function public.tg_mentores_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_service boolean := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role';
  v_priv boolean;
  v_super_count int;
begin
  if tg_op = 'DELETE' then
    if old.papel = 'super_admin' then
      select count(*) into v_super_count from mentores where papel = 'super_admin';
      if v_super_count <= 1 then
        raise exception 'Não é possível remover o último super admin.';
      end if;
    end if;
    return old;
  end if;

  if new.papel is null or not exists (select 1 from papeis where chave = new.papel) then
    raise exception 'Papel inválido: %', coalesce(new.papel, '(nulo)');
  end if;
  select coalesce(p.is_full or p.is_super, false) into v_priv from papeis p where p.chave = new.papel;

  if tg_op = 'INSERT' then
    if v_priv and not v_service and not is_super_admin() then
      raise exception 'Apenas super admin pode criar membro com papel privilegiado (%).', new.papel;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.papel is distinct from old.papel then
    if not v_service and not is_super_admin() then
      raise exception 'Apenas super admin pode alterar o papel de um membro.';
    end if;
    if old.papel = 'super_admin' and new.papel <> 'super_admin' then
      select count(*) into v_super_count from mentores where papel = 'super_admin';
      if v_super_count <= 1 then
        raise exception 'Não é possível rebaixar o último super admin.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mentores_guard on mentores;
create trigger trg_mentores_guard
  before insert or update or delete on mentores
  for each row execute function public.tg_mentores_guard();

-- 1.2 — empresa_usuarios: escrita exige a seção 'acessos'; e trava recVinculação cross-tenant.
alter policy empresa_usuarios_admin_write on empresa_usuarios
  using (is_admin() and pode_secao('acessos'))
  with check (is_admin() and pode_secao('acessos'));

create or replace function public.tg_empresa_usuarios_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (select 1 from empresa_usuarios e
             where e.auth_user_id = new.auth_user_id and e.id_cliente <> new.id_cliente) then
    raise exception 'Este login já está vinculado a outra empresa.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_empresa_usuarios_guard on empresa_usuarios;
create trigger trg_empresa_usuarios_guard
  before insert or update on empresa_usuarios
  for each row execute function public.tg_empresa_usuarios_guard();

-- 1.3 — Leitura de PII de cliente passa a exigir uma seção de cliente.
--       É NO-OP para admins full (super_admin/admin), que enxergam todas as seções;
--       só restringe futuros papéis limitados (cs/consultor/conteudo sem a seção).
create or replace function public.pode_ver_dados_cliente()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select is_admin() and (
    pode_secao('clientes') or pode_secao('crm') or pode_secao('radar-renovacao')
    or pode_secao('acessos') or pode_secao('onboarding') or pode_secao('respostas-onboarding')
  );
$$;

alter policy "clientes_entrada_select_self_or_admin" on clientes_entrada_new
  using ((meu_id_cliente() = id_cliente) or pode_ver_dados_cliente());
alter policy "Clients can read their own form data" on clientes_formulario
  using ((meu_id_cliente() = id_cliente) or pode_ver_dados_cliente());
alter policy "mentores_read_vitorias" on cliente_vitorias
  using (pode_ver_dados_cliente());
alter policy "equipe_all" on cliente_vitorias
  using (pode_ver_dados_cliente())
  with check (pode_ver_dados_cliente());
alter policy "Onboarding select own or admin" on cliente_onboarding
  using ((meu_id_cliente() = id_cliente) or pode_ver_dados_cliente());

-- 1.5 (parte) — REVOKE anon nas funções SECURITY DEFINER não redefinidas na migração de lógica.
--       (pontos_mc, ranking_guardioes e sync_badges têm o grant ajustado na 20260722b.)
revoke execute on function public.registrar_download(text, text, text, text) from anon;
revoke execute on function public.admin_clientes_pontos() from anon;
-- avaliar_top10 só deve rodar pelo cron (owner postgres); tira o grant de PUBLIC (que dá acesso a anon/authenticated)
revoke execute on function public.avaliar_top10() from public, anon, authenticated;

-- 1.6 — search_path fixo (advisor).
alter function public.safe_ddmmyyyy(text) set search_path = public;

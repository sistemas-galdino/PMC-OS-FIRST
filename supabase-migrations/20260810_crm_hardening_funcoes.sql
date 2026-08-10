-- CRM — hardening das funções criadas nas migrations 20260810_crm_*.
-- Fecha dois achados do advisor de segurança:
--   1. function_search_path_mutable nas 5 funções novas;
--   2. crm_meu_nome (SECURITY DEFINER, lê auth.users) executável por anon.

CREATE OR REPLACE FUNCTION public.crm_atividades_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_desde := now();
    IF NEW.status = 'realizado' AND NEW.data_conclusao IS NULL THEN
      NEW.data_conclusao := now();
    END IF;
    IF NEW.status <> 'realizado' THEN
      NEW.data_conclusao := NULL;
    END IF;
    IF NEW.status <> 'impedido' THEN
      NEW.motivo_impedimento := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_mensagens_touch_conversa()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.crm_conversas
     SET ultima_mensagem_em = GREATEST(coalesce(ultima_mensagem_em, NEW.em), NEW.em),
         updated_at = now()
   WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_safe_date(p text)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
BEGIN RETURN p::date; EXCEPTION WHEN others THEN RETURN NULL; END;
$$;

CREATE OR REPLACE FUNCTION public.crm_safe_uuid(p text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
BEGIN RETURN p::uuid; EXCEPTION WHEN others THEN RETURN NULL; END;
$$;

CREATE OR REPLACE FUNCTION public.crm_safe_time(p text)
RETURNS time LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
BEGIN RETURN p::time; EXCEPTION WHEN others THEN RETURN NULL; END;
$$;

REVOKE EXECUTE ON FUNCTION public.crm_meu_nome() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.crm_meu_nome() TO authenticated;

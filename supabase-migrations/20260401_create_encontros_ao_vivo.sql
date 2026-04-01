CREATE TABLE IF NOT EXISTS encontros_ao_vivo (
  id_unico              text PRIMARY KEY,
  id_evento_google      text UNIQUE,
  tipo_encontro         text CHECK (tipo_encontro IN (
                          'multiplica_time_nivel_1',
                          'multiplica_time_nivel_2',
                          'multiplica_dono',
                          'multiplica_case'
                        )),
  titulo_original       text,
  titulo_formatado      text,
  descricao             text,
  data_encontro         text,          -- DD/MM/YYYY
  horario_inicio        text,          -- HH:MM
  horario_fim           text,          -- HH:MM
  duracao_minutos       numeric,
  mes                   numeric,
  semana                numeric,
  ano                   numeric,
  inicio_semana         text,
  fim_semana            text,
  timezone              text,
  data_hora_inicio_iso  text,          -- ISO8601 completo (para gerar .ics)
  data_hora_fim_iso     text,          -- ISO8601 completo
  link_google_meet      text,
  link_gravacao         text,
  link_geminidoc        text,
  transcricao           text,
  transcricao_md        text,
  resumo                text,
  resumo_json           text,
  detalhes_encontro     text,
  status                text DEFAULT 'agendado' CHECK (status IN ('agendado', 'realizado', 'cancelado')),
  qtd_participantes     numeric,
  observacoes           text,
  created_at            text DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS'),
  updated_at            text DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

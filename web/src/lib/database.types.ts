// Tipos gerados do Supabase (projeto PROD). NÃO editar à mão.
// Regenerar: mcp generate_typescript_types (ou `supabase gen types typescript`).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agendamento_rate_limit: {
        Row: {
          criado_em: string
          id: number
          ip: string
        }
        Insert: {
          criado_em?: string
          id?: never
          ip: string
        }
        Update: {
          criado_em?: string
          id?: never
          ip?: string
        }
        Relationships: []
      }
      agent_conversations: {
        Row: {
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_enviados: {
        Row: {
          canal: string | null
          enviado_em: string | null
          id: string
          modelo: string | null
          nivel: string | null
          preco: number | null
          score: number | null
          url: string | null
        }
        Insert: {
          canal?: string | null
          enviado_em?: string | null
          id: string
          modelo?: string | null
          nivel?: string | null
          preco?: number | null
          score?: number | null
          url?: string | null
        }
        Update: {
          canal?: string | null
          enviado_em?: string | null
          id?: string
          modelo?: string | null
          nivel?: string | null
          preco?: number | null
          score?: number | null
          url?: string | null
        }
        Relationships: []
      }
      anuncios_motos: {
        Row: {
          abaixo_fipe: boolean | null
          ano: number | null
          categoria: string | null
          cidade: string | null
          cor: string | null
          criado_em: string | null
          dentro_margem: boolean | null
          diff_pct: number | null
          fipe_estimado: number | null
          fonte: string | null
          foto_url: string | null
          id: string
          km: number | null
          modelo: string
          preco: number | null
          updated_em: string | null
          url: string | null
        }
        Insert: {
          abaixo_fipe?: boolean | null
          ano?: number | null
          categoria?: string | null
          cidade?: string | null
          cor?: string | null
          criado_em?: string | null
          dentro_margem?: boolean | null
          diff_pct?: number | null
          fipe_estimado?: number | null
          fonte?: string | null
          foto_url?: string | null
          id?: string
          km?: number | null
          modelo: string
          preco?: number | null
          updated_em?: string | null
          url?: string | null
        }
        Update: {
          abaixo_fipe?: boolean | null
          ano?: number | null
          categoria?: string | null
          cidade?: string | null
          cor?: string | null
          criado_em?: string | null
          dentro_margem?: boolean | null
          diff_pct?: number | null
          fipe_estimado?: number | null
          fonte?: string | null
          foto_url?: string | null
          id?: string
          km?: number | null
          modelo?: string
          preco?: number | null
          updated_em?: string | null
          url?: string | null
        }
        Relationships: []
      }
      calendar_watch_channels: {
        Row: {
          calendar_email: string
          channel_id: string
          expiration: string
          last_notification_at: string | null
          last_renewed_at: string
          resource_id: string
          sync_token: string | null
          updated_at: string
        }
        Insert: {
          calendar_email: string
          channel_id: string
          expiration: string
          last_notification_at?: string | null
          last_renewed_at?: string
          resource_id: string
          sync_token?: string | null
          updated_at?: string
        }
        Update: {
          calendar_email?: string
          channel_id?: string
          expiration?: string
          last_notification_at?: string | null
          last_renewed_at?: string
          resource_id?: string
          sync_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      canais_vendas_metas: {
        Row: {
          ano: number
          canal: string
          id: string
          mes: number
          planejado: number
          produto: string
          realizado: number
          updated_at: string
        }
        Insert: {
          ano: number
          canal: string
          id?: string
          mes: number
          planejado?: number
          produto?: string
          realizado?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          canal?: string
          id?: string
          mes?: number
          planejado?: number
          produto?: string
          realizado?: number
          updated_at?: string
        }
        Relationships: []
      }
      cliente_anexos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          descricao: string | null
          enviado_por: string | null
          id: string
          id_cliente: string
          tipo: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          enviado_por?: string | null
          id?: string
          id_cliente: string
          tipo?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          enviado_por?: string | null
          id?: string
          id_cliente?: string
          tipo?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cliente_atividades: {
        Row: {
          created_at: string
          descricao: string | null
          entrega_outro: string | null
          entrega_relacionada: string | null
          id: string
          id_cliente: string
          observacoes: string | null
          prazo: string | null
          prioridade: string
          responsavel_cs: string | null
          status: string
          tipo: string | null
          tipo_outro: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          entrega_outro?: string | null
          entrega_relacionada?: string | null
          id?: string
          id_cliente: string
          observacoes?: string | null
          prazo?: string | null
          prioridade?: string
          responsavel_cs?: string | null
          status?: string
          tipo?: string | null
          tipo_outro?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          entrega_outro?: string | null
          entrega_relacionada?: string | null
          id?: string
          id_cliente?: string
          observacoes?: string | null
          prazo?: string | null
          prioridade?: string
          responsavel_cs?: string | null
          status?: string
          tipo?: string | null
          tipo_outro?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      cliente_canais: {
        Row: {
          created_at: string | null
          id: string
          id_cliente: string | null
          investimento: number | null
          leads_mes: number | null
          nome: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_cliente?: string | null
          investimento?: number | null
          leads_mes?: number | null
          nome: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_cliente?: string | null
          investimento?: number | null
          leads_mes?: number | null
          nome?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_canais_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      cliente_cancelamento: {
        Row: {
          created_at: string
          data_cancelamento: string
          id: string
          id_cliente: string
          motivos: string[]
          responsabilidade: string | null
          resumo_ocorrido: string | null
          tentativa_reversao: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_cancelamento?: string
          id?: string
          id_cliente: string
          motivos?: string[]
          responsabilidade?: string | null
          resumo_ocorrido?: string | null
          tentativa_reversao?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_cancelamento?: string
          id?: string
          id_cliente?: string
          motivos?: string[]
          responsabilidade?: string | null
          resumo_ocorrido?: string | null
          tentativa_reversao?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cliente_colaboradores: {
        Row: {
          cargo: string
          created_at: string
          guardiao_crm: boolean
          guardiao_ia: boolean
          id: string
          id_cliente: string
          nivel: string | null
          nome: string
          setor: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cargo: string
          created_at?: string
          guardiao_crm?: boolean
          guardiao_ia?: boolean
          id?: string
          id_cliente: string
          nivel?: string | null
          nome: string
          setor: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string
          guardiao_crm?: boolean
          guardiao_ia?: boolean
          id?: string
          id_cliente?: string
          nivel?: string | null
          nome?: string
          setor?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      cliente_diagnostico_inicial: {
        Row: {
          area_principal: string | null
          created_at: string
          dor_1: string | null
          dor_2: string | null
          dor_3: string | null
          fontes: string | null
          id_cliente: string
          objetivo_1: string | null
          objetivo_2: string | null
          objetivo_3: string | null
          resumo_cenario_inicial: string | null
          updated_at: string
          validacao_status: string | null
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          area_principal?: string | null
          created_at?: string
          dor_1?: string | null
          dor_2?: string | null
          dor_3?: string | null
          fontes?: string | null
          id_cliente: string
          objetivo_1?: string | null
          objetivo_2?: string | null
          objetivo_3?: string | null
          resumo_cenario_inicial?: string | null
          updated_at?: string
          validacao_status?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          area_principal?: string | null
          created_at?: string
          dor_1?: string | null
          dor_2?: string | null
          dor_3?: string | null
          fontes?: string | null
          id_cliente?: string
          objetivo_1?: string | null
          objetivo_2?: string | null
          objetivo_3?: string | null
          resumo_cenario_inicial?: string | null
          updated_at?: string
          validacao_status?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: []
      }
      cliente_empresas: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          id_cliente: string | null
          is_principal: boolean | null
          nicho: string | null
          nome_empresa: string
          nome_empresa_formatado: string | null
          subnicho: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          id_cliente?: string | null
          is_principal?: boolean | null
          nicho?: string | null
          nome_empresa: string
          nome_empresa_formatado?: string | null
          subnicho?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          id_cliente?: string | null
          is_principal?: boolean | null
          nicho?: string | null
          nome_empresa?: string
          nome_empresa_formatado?: string | null
          subnicho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_empresas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      cliente_etapas_metodo: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          created_at: string
          etapa: number
          id: string
          id_cliente: string
          updated_at: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          etapa: number
          id?: string
          id_cliente: string
          updated_at?: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          etapa?: number
          id?: string
          id_cliente?: string
          updated_at?: string
        }
        Relationships: []
      }
      cliente_evidencias_pendentes: {
        Row: {
          acao_recomendada: string | null
          created_at: string
          evidencia_arquivo_url: string | null
          evidencia_necessaria: string | null
          id: string
          id_cliente: string
          onde_mencionada: string | null
          periodo: string | null
          prioridade: string | null
          quem_pode_coletar: string | null
          status: string | null
          updated_at: string
          vitoria: string | null
          vitoria_id: string | null
        }
        Insert: {
          acao_recomendada?: string | null
          created_at?: string
          evidencia_arquivo_url?: string | null
          evidencia_necessaria?: string | null
          id?: string
          id_cliente: string
          onde_mencionada?: string | null
          periodo?: string | null
          prioridade?: string | null
          quem_pode_coletar?: string | null
          status?: string | null
          updated_at?: string
          vitoria?: string | null
          vitoria_id?: string | null
        }
        Update: {
          acao_recomendada?: string | null
          created_at?: string
          evidencia_arquivo_url?: string | null
          evidencia_necessaria?: string | null
          id?: string
          id_cliente?: string
          onde_mencionada?: string | null
          periodo?: string | null
          prioridade?: string | null
          quem_pode_coletar?: string | null
          status?: string | null
          updated_at?: string
          vitoria?: string | null
          vitoria_id?: string | null
        }
        Relationships: []
      }
      cliente_indicadores_mensais: {
        Row: {
          ano: number
          created_at: string | null
          faturamento: number
          frequencia_compra: number
          id_cliente: string
          investimento_trafego: number
          mes: number
          ticket_medio: number
          updated_at: string | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          faturamento?: number
          frequencia_compra?: number
          id_cliente: string
          investimento_trafego?: number
          mes: number
          ticket_medio?: number
          updated_at?: string | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          faturamento?: number
          frequencia_compra?: number
          id_cliente?: string
          investimento_trafego?: number
          mes?: number
          ticket_medio?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_indicadores_mensais_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      cliente_informacoes_empresa: {
        Row: {
          analise_ia: Json | null
          analise_ia_em: string | null
          created_at: string
          data_boas_vindas: string | null
          data_entrada: string | null
          id_cliente: string
          instagram: string | null
          nome_negocio: string | null
          site: string | null
          total_galdino: number
          updated_at: string
        }
        Insert: {
          analise_ia?: Json | null
          analise_ia_em?: string | null
          created_at?: string
          data_boas_vindas?: string | null
          data_entrada?: string | null
          id_cliente: string
          instagram?: string | null
          nome_negocio?: string | null
          site?: string | null
          total_galdino?: number
          updated_at?: string
        }
        Update: {
          analise_ia?: Json | null
          analise_ia_em?: string | null
          created_at?: string
          data_boas_vindas?: string | null
          data_entrada?: string | null
          id_cliente?: string
          instagram?: string | null
          nome_negocio?: string | null
          site?: string | null
          total_galdino?: number
          updated_at?: string
        }
        Relationships: []
      }
      cliente_metas: {
        Row: {
          colaboradores_total: number | null
          como_ajudar: string | null
          created_at: string | null
          crm_atual: string | null
          entregas_decisivas: string | null
          faturamento_anual_objetivo: number | null
          faturamento_mensal_objetivo: number | null
          id: string
          id_cliente: string | null
          meta_2026: number | null
          numero_funcionarios: number | null
          numero_gestores: number | null
          principais_desafios: string | null
          resultados_esperados: string | null
          updated_at: string | null
          usa_crm: boolean | null
          vai_usar_black_crm: boolean | null
        }
        Insert: {
          colaboradores_total?: number | null
          como_ajudar?: string | null
          created_at?: string | null
          crm_atual?: string | null
          entregas_decisivas?: string | null
          faturamento_anual_objetivo?: number | null
          faturamento_mensal_objetivo?: number | null
          id?: string
          id_cliente?: string | null
          meta_2026?: number | null
          numero_funcionarios?: number | null
          numero_gestores?: number | null
          principais_desafios?: string | null
          resultados_esperados?: string | null
          updated_at?: string | null
          usa_crm?: boolean | null
          vai_usar_black_crm?: boolean | null
        }
        Update: {
          colaboradores_total?: number | null
          como_ajudar?: string | null
          created_at?: string | null
          crm_atual?: string | null
          entregas_decisivas?: string | null
          faturamento_anual_objetivo?: number | null
          faturamento_mensal_objetivo?: number | null
          id?: string
          id_cliente?: string | null
          meta_2026?: number | null
          numero_funcionarios?: number | null
          numero_gestores?: number | null
          principais_desafios?: string | null
          resultados_esperados?: string | null
          updated_at?: string | null
          usa_crm?: boolean | null
          vai_usar_black_crm?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_metas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      cliente_objetivos_programa: {
        Row: {
          created_at: string | null
          id_cliente: string
          objetivo_key: string
          observacoes: string | null
          prioridade: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id_cliente: string
          objetivo_key: string
          observacoes?: string | null
          prioridade?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id_cliente?: string
          objetivo_key?: string
          observacoes?: string | null
          prioridade?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_objetivos_programa_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      cliente_onboarding: {
        Row: {
          cep: string | null
          cnpj: string | null
          como_conheceu: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          desafios: string | null
          descricao_negocio: string | null
          email: string | null
          email_representante: string | null
          empresa_nome: string | null
          endereco: string | null
          enviado_em: string | null
          estado_civil: string | null
          expectativa_galdino: string | null
          expectativas: string | null
          faixa_etaria: string | null
          faturamento_anual: string | null
          formacao_academica: string | null
          genero: string | null
          ia_agentes: boolean | null
          ia_dashboard: boolean | null
          ia_interesses: string[] | null
          ia_kpis: boolean | null
          ia_outro: string | null
          ia_processos: boolean | null
          ia_sistema: boolean | null
          id: string
          id_cliente: string
          instagram: string | null
          meta_12_meses: string | null
          motivo_entrada: string | null
          motivo_impedimento: string | null
          motivo_nao_superou: string | null
          nacionalidade: string | null
          nicho: string | null
          nivel_ia: number | null
          nome_completo: string | null
          numero_funcionarios: string | null
          numero_gestores: string | null
          pais: string
          profissao: string | null
          razao_social: string | null
          referencias_posicionamento: string | null
          resultado_final: string | null
          senha_definida: boolean
          site: string | null
          status: string
          step_atual: number
          telefone_representante: string | null
          tipo_pessoa: string | null
          tres_entregas: string | null
          uf: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          cnpj?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          desafios?: string | null
          descricao_negocio?: string | null
          email?: string | null
          email_representante?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          enviado_em?: string | null
          estado_civil?: string | null
          expectativa_galdino?: string | null
          expectativas?: string | null
          faixa_etaria?: string | null
          faturamento_anual?: string | null
          formacao_academica?: string | null
          genero?: string | null
          ia_agentes?: boolean | null
          ia_dashboard?: boolean | null
          ia_interesses?: string[] | null
          ia_kpis?: boolean | null
          ia_outro?: string | null
          ia_processos?: boolean | null
          ia_sistema?: boolean | null
          id?: string
          id_cliente: string
          instagram?: string | null
          meta_12_meses?: string | null
          motivo_entrada?: string | null
          motivo_impedimento?: string | null
          motivo_nao_superou?: string | null
          nacionalidade?: string | null
          nicho?: string | null
          nivel_ia?: number | null
          nome_completo?: string | null
          numero_funcionarios?: string | null
          numero_gestores?: string | null
          pais?: string
          profissao?: string | null
          razao_social?: string | null
          referencias_posicionamento?: string | null
          resultado_final?: string | null
          senha_definida?: boolean
          site?: string | null
          status?: string
          step_atual?: number
          telefone_representante?: string | null
          tipo_pessoa?: string | null
          tres_entregas?: string | null
          uf?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          cnpj?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          desafios?: string | null
          descricao_negocio?: string | null
          email?: string | null
          email_representante?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          enviado_em?: string | null
          estado_civil?: string | null
          expectativa_galdino?: string | null
          expectativas?: string | null
          faixa_etaria?: string | null
          faturamento_anual?: string | null
          formacao_academica?: string | null
          genero?: string | null
          ia_agentes?: boolean | null
          ia_dashboard?: boolean | null
          ia_interesses?: string[] | null
          ia_kpis?: boolean | null
          ia_outro?: string | null
          ia_processos?: boolean | null
          ia_sistema?: boolean | null
          id?: string
          id_cliente?: string
          instagram?: string | null
          meta_12_meses?: string | null
          motivo_entrada?: string | null
          motivo_impedimento?: string | null
          motivo_nao_superou?: string | null
          nacionalidade?: string | null
          nicho?: string | null
          nivel_ia?: number | null
          nome_completo?: string | null
          numero_funcionarios?: string | null
          numero_gestores?: string | null
          pais?: string
          profissao?: string | null
          razao_social?: string | null
          referencias_posicionamento?: string | null
          resultado_final?: string | null
          senha_definida?: boolean
          site?: string | null
          status?: string
          step_atual?: number
          telefone_representante?: string | null
          tipo_pessoa?: string | null
          tres_entregas?: string | null
          uf?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_onboarding_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      cliente_pilar_evidencias: {
        Row: {
          arquivos: Json
          campos: Json
          comentario: string | null
          created_at: string | null
          id: string
          id_cliente: string
          pilar_id: string
          updated_at: string | null
        }
        Insert: {
          arquivos?: Json
          campos?: Json
          comentario?: string | null
          created_at?: string | null
          id?: string
          id_cliente: string
          pilar_id: string
          updated_at?: string | null
        }
        Update: {
          arquivos?: Json
          campos?: Json
          comentario?: string | null
          created_at?: string | null
          id?: string
          id_cliente?: string
          pilar_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cliente_produtos: {
        Row: {
          classificacao_ticket: string | null
          created_at: string | null
          id: string
          id_cliente: string | null
          nome: string
          preco: number | null
          ticket_medio: number | null
          tipo: string | null
          updated_at: string | null
          vendas_mes: number | null
        }
        Insert: {
          classificacao_ticket?: string | null
          created_at?: string | null
          id?: string
          id_cliente?: string | null
          nome: string
          preco?: number | null
          ticket_medio?: number | null
          tipo?: string | null
          updated_at?: string | null
          vendas_mes?: number | null
        }
        Update: {
          classificacao_ticket?: string | null
          created_at?: string | null
          id?: string
          id_cliente?: string | null
          nome?: string
          preco?: number | null
          ticket_medio?: number | null
          tipo?: string | null
          updated_at?: string | null
          vendas_mes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_produtos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      cliente_renovacao: {
        Row: {
          created_at: string
          data_renovacao: string | null
          estado_atual: string | null
          id_cliente: string
          mes_inicio: string | null
          observacao: string | null
          probabilidade_renovacao: string | null
          status_renovacao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_renovacao?: string | null
          estado_atual?: string | null
          id_cliente: string
          mes_inicio?: string | null
          observacao?: string | null
          probabilidade_renovacao?: string | null
          status_renovacao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_renovacao?: string | null
          estado_atual?: string | null
          id_cliente?: string
          mes_inicio?: string | null
          observacao?: string | null
          probabilidade_renovacao?: string | null
          status_renovacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cliente_trilha_evidencias: {
        Row: {
          comentario: string | null
          concluida: boolean
          created_at: string | null
          evidencia_link: string | null
          evidencia_url: string | null
          id_cliente: string
          tarefa_id: string
          updated_at: string | null
        }
        Insert: {
          comentario?: string | null
          concluida?: boolean
          created_at?: string | null
          evidencia_link?: string | null
          evidencia_url?: string | null
          id_cliente: string
          tarefa_id: string
          updated_at?: string | null
        }
        Update: {
          comentario?: string | null
          concluida?: boolean
          created_at?: string | null
          evidencia_link?: string | null
          evidencia_url?: string | null
          id_cliente?: string
          tarefa_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cliente_ultima_interacao: {
        Row: {
          created_at: string
          data_interacao: string | null
          fonte: string | null
          id_cliente: string
          participantes: string | null
          pendencias_cliente: string | null
          pendencias_time: string | null
          principais_pontos: string | null
          proximos_passos: string | null
          responsavel: string | null
          status_atual: string | null
          tema: string | null
          tipo_interacao: string | null
          updated_at: string
          validacao_status: string | null
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          created_at?: string
          data_interacao?: string | null
          fonte?: string | null
          id_cliente: string
          participantes?: string | null
          pendencias_cliente?: string | null
          pendencias_time?: string | null
          principais_pontos?: string | null
          proximos_passos?: string | null
          responsavel?: string | null
          status_atual?: string | null
          tema?: string | null
          tipo_interacao?: string | null
          updated_at?: string
          validacao_status?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          created_at?: string
          data_interacao?: string | null
          fonte?: string | null
          id_cliente?: string
          participantes?: string | null
          pendencias_cliente?: string | null
          pendencias_time?: string | null
          principais_pontos?: string | null
          proximos_passos?: string | null
          responsavel?: string | null
          status_atual?: string | null
          tema?: string | null
          tipo_interacao?: string | null
          updated_at?: string
          validacao_status?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: []
      }
      cliente_visao_csc: {
        Row: {
          created_at: string
          cs_responsavel: string | null
          diagnostico_atual: string | null
          diagnostico_evidencias: string | null
          diagnostico_justificativa: string | null
          id_cliente: string
          info_renovacao: string | null
          nivel_engajamento: string | null
          oportunidades_renovacao: string | null
          pendencias_percebidas: string | null
          percepcao_relacionamento: string | null
          pontos_atencao: string | null
          proxima_acao_sugerida: string | null
          sinais_positivos: string | null
          sinais_risco: string | null
          updated_at: string
          visao_geral: string | null
        }
        Insert: {
          created_at?: string
          cs_responsavel?: string | null
          diagnostico_atual?: string | null
          diagnostico_evidencias?: string | null
          diagnostico_justificativa?: string | null
          id_cliente: string
          info_renovacao?: string | null
          nivel_engajamento?: string | null
          oportunidades_renovacao?: string | null
          pendencias_percebidas?: string | null
          percepcao_relacionamento?: string | null
          pontos_atencao?: string | null
          proxima_acao_sugerida?: string | null
          sinais_positivos?: string | null
          sinais_risco?: string | null
          updated_at?: string
          visao_geral?: string | null
        }
        Update: {
          created_at?: string
          cs_responsavel?: string | null
          diagnostico_atual?: string | null
          diagnostico_evidencias?: string | null
          diagnostico_justificativa?: string | null
          id_cliente?: string
          info_renovacao?: string | null
          nivel_engajamento?: string | null
          oportunidades_renovacao?: string | null
          pendencias_percebidas?: string | null
          percepcao_relacionamento?: string | null
          pontos_atencao?: string | null
          proxima_acao_sugerida?: string | null
          sinais_positivos?: string | null
          sinais_risco?: string | null
          updated_at?: string
          visao_geral?: string | null
        }
        Relationships: []
      }
      cliente_vitorias: {
        Row: {
          area: string
          como_esta_agora: string
          created_at: string | null
          data_registro: string | null
          data_vitoria: string
          evidencia_acao_recomendada: string | null
          evidencia_link: string | null
          evidencia_local: string | null
          evidencia_prioridade: string | null
          evidencia_quem_coleta: string | null
          evidencia_status: string | null
          evidencia_tipo: string | null
          evidencia_url: string | null
          gargalo_antes: string
          id: string
          id_cliente: string
          o_que_fez: string
          onde_citada: string | null
          origem: string
          qtd_antes: number | null
          qtd_depois: number | null
          relatada_para: string | null
          tem_evidencia: boolean | null
          titulo: string
          updated_at: string | null
          uso_renovacao: string | null
          validacao_status: string | null
          validado_em: string | null
          validado_por: string | null
          valor_antes: number | null
          valor_depois: number | null
        }
        Insert: {
          area: string
          como_esta_agora: string
          created_at?: string | null
          data_registro?: string | null
          data_vitoria: string
          evidencia_acao_recomendada?: string | null
          evidencia_link?: string | null
          evidencia_local?: string | null
          evidencia_prioridade?: string | null
          evidencia_quem_coleta?: string | null
          evidencia_status?: string | null
          evidencia_tipo?: string | null
          evidencia_url?: string | null
          gargalo_antes: string
          id?: string
          id_cliente: string
          o_que_fez: string
          onde_citada?: string | null
          origem: string
          qtd_antes?: number | null
          qtd_depois?: number | null
          relatada_para?: string | null
          tem_evidencia?: boolean | null
          titulo: string
          updated_at?: string | null
          uso_renovacao?: string | null
          validacao_status?: string | null
          validado_em?: string | null
          validado_por?: string | null
          valor_antes?: number | null
          valor_depois?: number | null
        }
        Update: {
          area?: string
          como_esta_agora?: string
          created_at?: string | null
          data_registro?: string | null
          data_vitoria?: string
          evidencia_acao_recomendada?: string | null
          evidencia_link?: string | null
          evidencia_local?: string | null
          evidencia_prioridade?: string | null
          evidencia_quem_coleta?: string | null
          evidencia_status?: string | null
          evidencia_tipo?: string | null
          evidencia_url?: string | null
          gargalo_antes?: string
          id?: string
          id_cliente?: string
          o_que_fez?: string
          onde_citada?: string | null
          origem?: string
          qtd_antes?: number | null
          qtd_depois?: number | null
          relatada_para?: string | null
          tem_evidencia?: boolean | null
          titulo?: string
          updated_at?: string | null
          uso_renovacao?: string | null
          validacao_status?: string | null
          validado_em?: string | null
          validado_por?: string | null
          valor_antes?: number | null
          valor_depois?: number | null
        }
        Relationships: []
      }
      clientes_entrada_new: {
        Row: {
          ano_treinamento: number | null
          avatar_url: string | null
          blackcrm_participa_tutoria: string | null
          blackcrm_status_conta: string | null
          blackcrm_status_implementacao: string | null
          blackcrm_tem_vitorias: string | null
          blackcrm_vitorias_descricao: string | null
          canal_de_venda: string | null
          cnpj: string | null
          codigo_cliente: number | null
          comunicacao_canal: string | null
          comunicacao_preferencia: string | null
          comunicacao_restricoes: string | null
          comunicacao_resumo: string | null
          created_at: string | null
          data: string | null
          data_cancelamento: string | null
          em_risco_cancelamento: boolean
          estado_uf: string | null
          frequencia_grupo_whatsapp: string | null
          guardiao_crm_nome: string | null
          guardiao_crm_telefone: string | null
          guardiao_ia_cargo: string | null
          guardiao_ia_nome: string | null
          guardiao_ia_telefone: string | null
          id_cliente: string | null
          id_entrada: number
          link_grupo_whatsapp: string | null
          mes_treinamento: string | null
          moeda: string
          motivo_cancelamento: string | null
          nicho: string | null
          nivel_engajamento: string | null
          nivel_multiplicador: string | null
          nome_cliente: string | null
          nome_cliente_formatado: string | null
          nome_empresa: string | null
          nome_empresa_formatado: string | null
          nomes_contas_blackcrm: string | null
          observacoes_cs: string | null
          origem: string | null
          pais: string
          presenca_treinamentos: string | null
          produto: string | null
          quantas_contas_blackcrm: number
          renovacao_data: string | null
          renovacao_observacoes: string | null
          renovacao_status: string | null
          renovacao_valor: number | null
          reuniao_consultores_status: string | null
          reuniao_galdino_status: string | null
          saude_cliente: string | null
          sc: string | null
          status_atual: string | null
          subnicho: string | null
          telefone: string | null
          tem_conta_blackcrm: string | null
          tem_crm: boolean | null
          tem_guardiao_crm: string | null
          tem_guardiao_ia: string | null
          tem_sdr: boolean | null
          temperatura_cliente: string | null
          tempo_contrato: number | null
          unidade_treinamento: string | null
        }
        Insert: {
          ano_treinamento?: number | null
          avatar_url?: string | null
          blackcrm_participa_tutoria?: string | null
          blackcrm_status_conta?: string | null
          blackcrm_status_implementacao?: string | null
          blackcrm_tem_vitorias?: string | null
          blackcrm_vitorias_descricao?: string | null
          canal_de_venda?: string | null
          cnpj?: string | null
          codigo_cliente?: number | null
          comunicacao_canal?: string | null
          comunicacao_preferencia?: string | null
          comunicacao_restricoes?: string | null
          comunicacao_resumo?: string | null
          created_at?: string | null
          data?: string | null
          data_cancelamento?: string | null
          em_risco_cancelamento?: boolean
          estado_uf?: string | null
          frequencia_grupo_whatsapp?: string | null
          guardiao_crm_nome?: string | null
          guardiao_crm_telefone?: string | null
          guardiao_ia_cargo?: string | null
          guardiao_ia_nome?: string | null
          guardiao_ia_telefone?: string | null
          id_cliente?: string | null
          id_entrada?: number
          link_grupo_whatsapp?: string | null
          mes_treinamento?: string | null
          moeda?: string
          motivo_cancelamento?: string | null
          nicho?: string | null
          nivel_engajamento?: string | null
          nivel_multiplicador?: string | null
          nome_cliente?: string | null
          nome_cliente_formatado?: string | null
          nome_empresa?: string | null
          nome_empresa_formatado?: string | null
          nomes_contas_blackcrm?: string | null
          observacoes_cs?: string | null
          origem?: string | null
          pais?: string
          presenca_treinamentos?: string | null
          produto?: string | null
          quantas_contas_blackcrm?: number
          renovacao_data?: string | null
          renovacao_observacoes?: string | null
          renovacao_status?: string | null
          renovacao_valor?: number | null
          reuniao_consultores_status?: string | null
          reuniao_galdino_status?: string | null
          saude_cliente?: string | null
          sc?: string | null
          status_atual?: string | null
          subnicho?: string | null
          telefone?: string | null
          tem_conta_blackcrm?: string | null
          tem_crm?: boolean | null
          tem_guardiao_crm?: string | null
          tem_guardiao_ia?: string | null
          tem_sdr?: boolean | null
          temperatura_cliente?: string | null
          tempo_contrato?: number | null
          unidade_treinamento?: string | null
        }
        Update: {
          ano_treinamento?: number | null
          avatar_url?: string | null
          blackcrm_participa_tutoria?: string | null
          blackcrm_status_conta?: string | null
          blackcrm_status_implementacao?: string | null
          blackcrm_tem_vitorias?: string | null
          blackcrm_vitorias_descricao?: string | null
          canal_de_venda?: string | null
          cnpj?: string | null
          codigo_cliente?: number | null
          comunicacao_canal?: string | null
          comunicacao_preferencia?: string | null
          comunicacao_restricoes?: string | null
          comunicacao_resumo?: string | null
          created_at?: string | null
          data?: string | null
          data_cancelamento?: string | null
          em_risco_cancelamento?: boolean
          estado_uf?: string | null
          frequencia_grupo_whatsapp?: string | null
          guardiao_crm_nome?: string | null
          guardiao_crm_telefone?: string | null
          guardiao_ia_cargo?: string | null
          guardiao_ia_nome?: string | null
          guardiao_ia_telefone?: string | null
          id_cliente?: string | null
          id_entrada?: number
          link_grupo_whatsapp?: string | null
          mes_treinamento?: string | null
          moeda?: string
          motivo_cancelamento?: string | null
          nicho?: string | null
          nivel_engajamento?: string | null
          nivel_multiplicador?: string | null
          nome_cliente?: string | null
          nome_cliente_formatado?: string | null
          nome_empresa?: string | null
          nome_empresa_formatado?: string | null
          nomes_contas_blackcrm?: string | null
          observacoes_cs?: string | null
          origem?: string | null
          pais?: string
          presenca_treinamentos?: string | null
          produto?: string | null
          quantas_contas_blackcrm?: number
          renovacao_data?: string | null
          renovacao_observacoes?: string | null
          renovacao_status?: string | null
          renovacao_valor?: number | null
          reuniao_consultores_status?: string | null
          reuniao_galdino_status?: string | null
          saude_cliente?: string | null
          sc?: string | null
          status_atual?: string | null
          subnicho?: string | null
          telefone?: string | null
          tem_conta_blackcrm?: string | null
          tem_crm?: boolean | null
          tem_guardiao_crm?: string | null
          tem_guardiao_ia?: string | null
          tem_sdr?: boolean | null
          temperatura_cliente?: string | null
          tempo_contrato?: number | null
          unidade_treinamento?: string | null
        }
        Relationships: []
      }
      clientes_formulario: {
        Row: {
          ajuda_3_meses: string | null
          ano_treinamento: number | null
          canal_venda: string | null
          cargos_gestao: string | null
          cnpj: string | null
          codigo_cliente: number
          como_conheceu: string | null
          contrato_emitido_para: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          desafios: string | null
          descricao: string | null
          email: string | null
          empresa_nome: string | null
          endereco: string | null
          entregas_determinantes: string | null
          estado: string | null
          estado_civil: string | null
          faixa_etaria: string | null
          faturamento_atual: string | null
          formacao_academica: string | null
          genero: string | null
          id_cliente: string
          instagram: string[] | null
          mes_treinamento: string | null
          meta_faturamento_12_meses: number | null
          motivo_entrada: string | null
          motivo_impedimento: string | null
          nacionalidade: string | null
          nicho: string | null
          nome: string | null
          nome_cliente_formatado: string | null
          nome_empresa_formatado: string | null
          numero_funcionarios: string | null
          produto: string | null
          profissao: string | null
          razao_social: string | null
          referencia_posicionamento: string | null
          resultado_desejado: string | null
          site: string | null
          telefone: string | null
          tempo_contrato_meses: number | null
          unidade: string | null
        }
        Insert: {
          ajuda_3_meses?: string | null
          ano_treinamento?: number | null
          canal_venda?: string | null
          cargos_gestao?: string | null
          cnpj?: string | null
          codigo_cliente: number
          como_conheceu?: string | null
          contrato_emitido_para?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          desafios?: string | null
          descricao?: string | null
          email?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          entregas_determinantes?: string | null
          estado?: string | null
          estado_civil?: string | null
          faixa_etaria?: string | null
          faturamento_atual?: string | null
          formacao_academica?: string | null
          genero?: string | null
          id_cliente?: string
          instagram?: string[] | null
          mes_treinamento?: string | null
          meta_faturamento_12_meses?: number | null
          motivo_entrada?: string | null
          motivo_impedimento?: string | null
          nacionalidade?: string | null
          nicho?: string | null
          nome?: string | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          numero_funcionarios?: string | null
          produto?: string | null
          profissao?: string | null
          razao_social?: string | null
          referencia_posicionamento?: string | null
          resultado_desejado?: string | null
          site?: string | null
          telefone?: string | null
          tempo_contrato_meses?: number | null
          unidade?: string | null
        }
        Update: {
          ajuda_3_meses?: string | null
          ano_treinamento?: number | null
          canal_venda?: string | null
          cargos_gestao?: string | null
          cnpj?: string | null
          codigo_cliente?: number
          como_conheceu?: string | null
          contrato_emitido_para?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          desafios?: string | null
          descricao?: string | null
          email?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          entregas_determinantes?: string | null
          estado?: string | null
          estado_civil?: string | null
          faixa_etaria?: string | null
          faturamento_atual?: string | null
          formacao_academica?: string | null
          genero?: string | null
          id_cliente?: string
          instagram?: string[] | null
          mes_treinamento?: string | null
          meta_faturamento_12_meses?: number | null
          motivo_entrada?: string | null
          motivo_impedimento?: string | null
          nacionalidade?: string | null
          nicho?: string | null
          nome?: string | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          numero_funcionarios?: string | null
          produto?: string | null
          profissao?: string | null
          razao_social?: string | null
          referencia_posicionamento?: string | null
          resultado_desejado?: string | null
          site?: string | null
          telefone?: string | null
          tempo_contrato_meses?: number | null
          unidade?: string | null
        }
        Relationships: []
      }
      comunidade_novidades: {
        Row: {
          autor: string | null
          autor_avatar_url: string | null
          categoria: string
          conteudo: string | null
          created_at: string
          data_publicacao: string
          destaque: boolean
          id: string
          publicado: boolean
          resumo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          autor?: string | null
          autor_avatar_url?: string | null
          categoria?: string
          conteudo?: string | null
          created_at?: string
          data_publicacao?: string
          destaque?: boolean
          id?: string
          publicado?: boolean
          resumo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          autor?: string | null
          autor_avatar_url?: string | null
          categoria?: string
          conteudo?: string | null
          created_at?: string
          data_publicacao?: string
          destaque?: boolean
          id?: string
          publicado?: boolean
          resumo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      comunidade_novidades_comentarios: {
        Row: {
          autor_avatar_url: string | null
          autor_nome: string | null
          created_at: string
          id: string
          id_autor: string
          id_novidade: string
          is_admin: boolean
          parent_id: string | null
          texto: string
        }
        Insert: {
          autor_avatar_url?: string | null
          autor_nome?: string | null
          created_at?: string
          id?: string
          id_autor: string
          id_novidade: string
          is_admin?: boolean
          parent_id?: string | null
          texto: string
        }
        Update: {
          autor_avatar_url?: string | null
          autor_nome?: string | null
          created_at?: string
          id?: string
          id_autor?: string
          id_novidade?: string
          is_admin?: boolean
          parent_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunidade_novidades_comentarios_id_novidade_fkey"
            columns: ["id_novidade"]
            isOneToOne: false
            referencedRelation: "comunidade_novidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunidade_novidades_comentarios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comunidade_novidades_comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      comunidade_novidades_likes: {
        Row: {
          created_at: string
          id: string
          id_cliente: string
          id_novidade: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_cliente: string
          id_novidade: string
        }
        Update: {
          created_at?: string
          id?: string
          id_cliente?: string
          id_novidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunidade_novidades_likes_id_novidade_fkey"
            columns: ["id_novidade"]
            isOneToOne: false
            referencedRelation: "comunidade_novidades"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_links: {
        Row: {
          ativo: boolean | null
          chave: string
          created_at: string | null
          descricao: string | null
          id: number
          label: string
          updated_at: string | null
          url: string
        }
        Insert: {
          ativo?: boolean | null
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: number
          label: string
          updated_at?: string | null
          url?: string
        }
        Update: {
          ativo?: boolean | null
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: number
          label?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      conhecimento_estudos_caso: {
        Row: {
          autor: string | null
          autor_papel: string | null
          created_at: string
          data_publicacao: string
          destaque: boolean
          id: string
          metricas: Json
          publicado: boolean
          resumo: string | null
          sobre: string | null
          tags: Json
          thumbnail_url: string | null
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          autor?: string | null
          autor_papel?: string | null
          created_at?: string
          data_publicacao?: string
          destaque?: boolean
          id?: string
          metricas?: Json
          publicado?: boolean
          resumo?: string | null
          sobre?: string | null
          tags?: Json
          thumbnail_url?: string | null
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          autor?: string | null
          autor_papel?: string | null
          created_at?: string
          data_publicacao?: string
          destaque?: boolean
          id?: string
          metricas?: Json
          publicado?: boolean
          resumo?: string | null
          sobre?: string | null
          tags?: Json
          thumbnail_url?: string | null
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      conhecimento_multiplicadores: {
        Row: {
          categoria: string
          cor: string
          created_at: string
          descricao: string | null
          destaque: boolean
          detalhe: string | null
          icon: string
          id: string
          importar_url: string | null
          inclui: Json
          nome: string
          ordem: number
          plataforma: string | null
          publicado: boolean
          slug: string
          tags: Json
          tempo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          cor?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          detalhe?: string | null
          icon?: string
          id?: string
          importar_url?: string | null
          inclui?: Json
          nome: string
          ordem?: number
          plataforma?: string | null
          publicado?: boolean
          slug: string
          tags?: Json
          tempo?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          cor?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          detalhe?: string | null
          icon?: string
          id?: string
          importar_url?: string | null
          inclui?: Json
          nome?: string
          ordem?: number
          plataforma?: string | null
          publicado?: boolean
          slug?: string
          tags?: Json
          tempo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      conhecimento_skills: {
        Row: {
          arquivo_url: string | null
          categoria: string
          cor: string
          created_at: string
          descricao: string | null
          destaque: boolean
          formato: string
          gatilho: string | null
          icon: string
          id: string
          nome: string
          ordem: number
          publicado: boolean
          slug: string
          tags: Json
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          categoria?: string
          cor?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          formato?: string
          gatilho?: string | null
          icon?: string
          id?: string
          nome: string
          ordem?: number
          publicado?: boolean
          slug: string
          tags?: Json
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          categoria?: string
          cor?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          formato?: string
          gatilho?: string | null
          icon?: string
          id?: string
          nome?: string
          ordem?: number
          publicado?: boolean
          slug?: string
          tags?: Json
          updated_at?: string
        }
        Relationships: []
      }
      consultores_atendimento: {
        Row: {
          accent: string
          ativo: boolean
          avatar_url: string | null
          cor_agenda: number | null
          created_at: string
          descricao: string | null
          duracao_padrao_minutos: number
          email: string | null
          email_calendar: string
          especialidade: string | null
          id: string
          nome: string
          nomes_match: string[]
          ordem: number
          slug: string
          tabela_destino: string
          tipo_reuniao: string | null
          updated_at: string
        }
        Insert: {
          accent?: string
          ativo?: boolean
          avatar_url?: string | null
          cor_agenda?: number | null
          created_at?: string
          descricao?: string | null
          duracao_padrao_minutos?: number
          email?: string | null
          email_calendar: string
          especialidade?: string | null
          id?: string
          nome: string
          nomes_match?: string[]
          ordem?: number
          slug: string
          tabela_destino: string
          tipo_reuniao?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string
          ativo?: boolean
          avatar_url?: string | null
          cor_agenda?: number | null
          created_at?: string
          descricao?: string | null
          duracao_padrao_minutos?: number
          email?: string | null
          email_calendar?: string
          especialidade?: string | null
          id?: string
          nome?: string
          nomes_match?: string[]
          ordem?: number
          slug?: string
          tabela_destino?: string
          tipo_reuniao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consultores_disponibilidade: {
        Row: {
          consultor_id: string
          created_at: string
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id: string
        }
        Insert: {
          consultor_id: string
          created_at?: string
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id?: string
        }
        Update: {
          consultor_id?: string
          created_at?: string
          dia_semana?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultores_disponibilidade_consultor_id_fkey"
            columns: ["consultor_id"]
            isOneToOne: false
            referencedRelation: "consultores_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      consultores_excecoes: {
        Row: {
          consultor_id: string
          created_at: string
          data: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          motivo: string | null
          tipo: string
        }
        Insert: {
          consultor_id: string
          created_at?: string
          data: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          motivo?: string | null
          tipo: string
        }
        Update: {
          consultor_id?: string
          created_at?: string
          data?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          motivo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultores_excecoes_consultor_id_fkey"
            columns: ["consultor_id"]
            isOneToOne: false
            referencedRelation: "consultores_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          company_name: string | null
          created_at: string | null
          id: string
          sector: string | null
          squad_ids: Json | null
          system_prompt: string | null
          updated_at: string | null
          user_name: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          sector?: string | null
          squad_ids?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          sector?: string | null
          squad_ids?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      cs_acompanhamento: {
        Row: {
          codigo_cliente: number | null
          created_at: string | null
          cs_responsavel: string | null
          id: string
          id_entrada: number | null
          implementou_acao: boolean | null
          nivel_escalada: string | null
          nome_cliente: string | null
          nome_empresa: string | null
          observacao: string | null
          participou_encontro: boolean | null
          plano_acao_semana: string | null
          proximo_passo: string | null
          respondeu_whatsapp: boolean | null
          semana_inicio: string
          semanas_sem_resposta: number | null
          updated_at: string | null
        }
        Insert: {
          codigo_cliente?: number | null
          created_at?: string | null
          cs_responsavel?: string | null
          id?: string
          id_entrada?: number | null
          implementou_acao?: boolean | null
          nivel_escalada?: string | null
          nome_cliente?: string | null
          nome_empresa?: string | null
          observacao?: string | null
          participou_encontro?: boolean | null
          plano_acao_semana?: string | null
          proximo_passo?: string | null
          respondeu_whatsapp?: boolean | null
          semana_inicio: string
          semanas_sem_resposta?: number | null
          updated_at?: string | null
        }
        Update: {
          codigo_cliente?: number | null
          created_at?: string | null
          cs_responsavel?: string | null
          id?: string
          id_entrada?: number | null
          implementou_acao?: boolean | null
          nivel_escalada?: string | null
          nome_cliente?: string | null
          nome_empresa?: string | null
          observacao?: string | null
          participou_encontro?: boolean | null
          plano_acao_semana?: string | null
          proximo_passo?: string | null
          respondeu_whatsapp?: boolean | null
          semana_inicio?: string
          semanas_sem_resposta?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_acompanhamento_id_entrada_fkey"
            columns: ["id_entrada"]
            isOneToOne: false
            referencedRelation: "clientes_entrada_new"
            referencedColumns: ["id_entrada"]
          },
        ]
      }
      cs_evidencias: {
        Row: {
          codigo_cliente: number | null
          created_at: string | null
          cs_responsavel: string | null
          descricao: string | null
          id: string
          id_entrada: number | null
          nome_cliente: string | null
          nome_empresa: string | null
          semana_inicio: string
          tipo: string | null
        }
        Insert: {
          codigo_cliente?: number | null
          created_at?: string | null
          cs_responsavel?: string | null
          descricao?: string | null
          id?: string
          id_entrada?: number | null
          nome_cliente?: string | null
          nome_empresa?: string | null
          semana_inicio: string
          tipo?: string | null
        }
        Update: {
          codigo_cliente?: number | null
          created_at?: string | null
          cs_responsavel?: string | null
          descricao?: string | null
          id?: string
          id_entrada?: number | null
          nome_cliente?: string | null
          nome_empresa?: string | null
          semana_inicio?: string
          tipo?: string | null
        }
        Relationships: []
      }
      encontros_ao_vivo: {
        Row: {
          ano: number | null
          created_at: string | null
          data_encontro: string | null
          data_hora_fim_iso: string | null
          data_hora_inicio_iso: string | null
          descricao: string | null
          detalhes_encontro: string | null
          duracao_minutos: number | null
          fim_semana: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id_evento_google: string | null
          id_unico: string
          inicio_semana: string | null
          link_geminidoc: string | null
          link_google_meet: string | null
          link_gravacao: string | null
          mes: number | null
          observacoes: string | null
          qtd_participantes: number | null
          resumo: string | null
          resumo_json: string | null
          semana: number | null
          status: string | null
          timezone: string | null
          tipo_encontro: string | null
          titulo_formatado: string | null
          titulo_original: string | null
          transcricao: string | null
          transcricao_md: string | null
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          created_at?: string | null
          data_encontro?: string | null
          data_hora_fim_iso?: string | null
          data_hora_inicio_iso?: string | null
          descricao?: string | null
          detalhes_encontro?: string | null
          duracao_minutos?: number | null
          fim_semana?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id_evento_google?: string | null
          id_unico: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_google_meet?: string | null
          link_gravacao?: string | null
          mes?: number | null
          observacoes?: string | null
          qtd_participantes?: number | null
          resumo?: string | null
          resumo_json?: string | null
          semana?: number | null
          status?: string | null
          timezone?: string | null
          tipo_encontro?: string | null
          titulo_formatado?: string | null
          titulo_original?: string | null
          transcricao?: string | null
          transcricao_md?: string | null
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          created_at?: string | null
          data_encontro?: string | null
          data_hora_fim_iso?: string | null
          data_hora_inicio_iso?: string | null
          descricao?: string | null
          detalhes_encontro?: string | null
          duracao_minutos?: number | null
          fim_semana?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id_evento_google?: string | null
          id_unico?: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_google_meet?: string | null
          link_gravacao?: string | null
          mes?: number | null
          observacoes?: string | null
          qtd_participantes?: number | null
          resumo?: string | null
          resumo_json?: string | null
          semana?: number | null
          status?: string | null
          timezone?: string | null
          tipo_encontro?: string | null
          titulo_formatado?: string | null
          titulo_original?: string | null
          transcricao?: string | null
          transcricao_md?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feriados: {
        Row: {
          created_at: string
          data: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      ferramentas_ia: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string
          features: string[]
          id: string
          nome: string
          ordem: number
          preco: string
          subtitulo: string | null
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao: string
          features?: string[]
          id?: string
          nome: string
          ordem?: number
          preco: string
          subtitulo?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          features?: string[]
          id?: string
          nome?: string
          ordem?: number
          preco?: string
          subtitulo?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      fipe_cache: {
        Row: {
          ano: number | null
          codigo_fipe: string | null
          id: number
          marca: string
          modelo: string
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          ano?: number | null
          codigo_fipe?: string | null
          id?: number
          marca: string
          modelo: string
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          ano?: number | null
          codigo_fipe?: string | null
          id?: number
          marca?: string
          modelo?: string
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      funis_aplicacao: {
        Row: {
          ad_spend: number
          applications: number
          calls_made: number
          created_at: string
          form_no: number
          form_yes: number
          id: string
          notes: string | null
          period_end: string | null
          record_date: string
          revenue: number
          sales_made: number
          updated_at: string
        }
        Insert: {
          ad_spend?: number
          applications?: number
          calls_made?: number
          created_at?: string
          form_no?: number
          form_yes?: number
          id?: string
          notes?: string | null
          period_end?: string | null
          record_date: string
          revenue?: number
          sales_made?: number
          updated_at?: string
        }
        Update: {
          ad_spend?: number
          applications?: number
          calls_made?: number
          created_at?: string
          form_no?: number
          form_yes?: number
          id?: string
          notes?: string | null
          period_end?: string | null
          record_date?: string
          revenue?: number
          sales_made?: number
          updated_at?: string
        }
        Relationships: []
      }
      funis_eventos: {
        Row: {
          bought_pitch: number
          city: string
          class_name: string
          created_at: string
          event_date: string
          followup_7d: number
          id: string
          notes: string | null
          participants: number
          partner_name: string | null
          qualified: number
          updated_at: string
        }
        Insert: {
          bought_pitch?: number
          city: string
          class_name: string
          created_at?: string
          event_date?: string
          followup_7d?: number
          id?: string
          notes?: string | null
          participants?: number
          partner_name?: string | null
          qualified?: number
          updated_at?: string
        }
        Update: {
          bought_pitch?: number
          city?: string
          class_name?: string
          created_at?: string
          event_date?: string
          followup_7d?: number
          id?: string
          notes?: string | null
          participants?: number
          partner_name?: string | null
          qualified?: number
          updated_at?: string
        }
        Relationships: []
      }
      funis_social_selling: {
        Row: {
          approaches: number
          call_invites: number
          conversations: number
          created_at: string
          id: string
          meetings_scheduled: number
          notes: string | null
          record_date: string
          updated_at: string
        }
        Insert: {
          approaches?: number
          call_invites?: number
          conversations?: number
          created_at?: string
          id?: string
          meetings_scheduled?: number
          notes?: string | null
          record_date: string
          updated_at?: string
        }
        Update: {
          approaches?: number
          call_invites?: number
          conversations?: number
          created_at?: string
          id?: string
          meetings_scheduled?: number
          notes?: string | null
          record_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      guardiao_assessment_results: {
        Row: {
          ai_tools_text: string | null
          classification: string
          computed_at: string
          disc_breakdown: Json
          disc_dominant: string
          id: string
          invite_id: string
          max_points: number
          pillar_scores: Json
          score_pct: number
          total_points: number
        }
        Insert: {
          ai_tools_text?: string | null
          classification: string
          computed_at?: string
          disc_breakdown: Json
          disc_dominant: string
          id?: string
          invite_id: string
          max_points: number
          pillar_scores: Json
          score_pct: number
          total_points: number
        }
        Update: {
          ai_tools_text?: string | null
          classification?: string
          computed_at?: string
          disc_breakdown?: Json
          disc_dominant?: string
          id?: string
          invite_id?: string
          max_points?: number
          pillar_scores?: Json
          score_pct?: number
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "guardiao_assessment_results_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: true
            referencedRelation: "guardiao_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      guardiao_assessments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          type: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          type: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          type?: string
          version?: number
        }
        Relationships: []
      }
      guardiao_candidate_responses: {
        Row: {
          created_at: string
          disc_tags: string[]
          id: string
          invite_id: string
          option_id: string | null
          points: number
          question_id: string
          text_answer: string | null
        }
        Insert: {
          created_at?: string
          disc_tags?: string[]
          id?: string
          invite_id: string
          option_id?: string | null
          points?: number
          question_id: string
          text_answer?: string | null
        }
        Update: {
          created_at?: string
          disc_tags?: string[]
          id?: string
          invite_id?: string
          option_id?: string | null
          points?: number
          question_id?: string
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardiao_candidate_responses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "guardiao_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardiao_candidate_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "guardiao_question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardiao_candidate_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "guardiao_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      guardiao_invites: {
        Row: {
          assessment_id: string
          candidate_email: string | null
          candidate_name: string | null
          candidate_whatsapp: string | null
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          id_cliente: string
          stage: string | null
          status: string
          token: string
        }
        Insert: {
          assessment_id: string
          candidate_email?: string | null
          candidate_name?: string | null
          candidate_whatsapp?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          id_cliente: string
          stage?: string | null
          status?: string
          token?: string
        }
        Update: {
          assessment_id?: string
          candidate_email?: string | null
          candidate_name?: string | null
          candidate_whatsapp?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          id_cliente?: string
          stage?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardiao_invites_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "guardiao_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      guardiao_question_options: {
        Row: {
          disc_tags: string[]
          id: string
          label: string
          letter: string | null
          order_index: number
          points: number
          question_id: string
        }
        Insert: {
          disc_tags?: string[]
          id?: string
          label: string
          letter?: string | null
          order_index: number
          points: number
          question_id: string
        }
        Update: {
          disc_tags?: string[]
          id?: string
          label?: string
          letter?: string | null
          order_index?: number
          points?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardiao_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "guardiao_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      guardiao_questions: {
        Row: {
          assessment_id: string
          code: string
          created_at: string
          id: string
          order_index: number
          pillar: string
          prompt: string
          scenario_label: string | null
          type: string
        }
        Insert: {
          assessment_id: string
          code: string
          created_at?: string
          id?: string
          order_index: number
          pillar: string
          prompt: string
          scenario_label?: string | null
          type: string
        }
        Update: {
          assessment_id?: string
          code?: string
          created_at?: string
          id?: string
          order_index?: number
          pillar?: string
          prompt?: string
          scenario_label?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardiao_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "guardiao_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      guardiao_share_links: {
        Row: {
          created_at: string
          id: string
          id_cliente: string
          token: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_cliente: string
          token?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          id_cliente?: string
          token?: string
          type?: string
        }
        Relationships: []
      }
      invite_resend_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      mentores: {
        Row: {
          created_at: string
          email: string | null
          foco: string | null
          id: number
          nome: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          foco?: string | null
          id?: number
          nome?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          foco?: string | null
          id?: number
          nome?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metodo_area_ciclos: {
        Row: {
          ano: number
          created_at: string
          dados_conteudo: string | null
          dados_status: string
          documento_nome: string | null
          documento_texto: string | null
          documento_url: string | null
          estrategia_conteudo: string | null
          estrategia_status: string
          gerado_por_ia: boolean
          id: string
          id_area: string
          id_cliente: string
          informacao_conteudo: string | null
          informacao_status: string
          mes: number
          receita_conteudo: string | null
          receita_status: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          dados_conteudo?: string | null
          dados_status?: string
          documento_nome?: string | null
          documento_texto?: string | null
          documento_url?: string | null
          estrategia_conteudo?: string | null
          estrategia_status?: string
          gerado_por_ia?: boolean
          id?: string
          id_area: string
          id_cliente: string
          informacao_conteudo?: string | null
          informacao_status?: string
          mes: number
          receita_conteudo?: string | null
          receita_status?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          dados_conteudo?: string | null
          dados_status?: string
          documento_nome?: string | null
          documento_texto?: string | null
          documento_url?: string | null
          estrategia_conteudo?: string | null
          estrategia_status?: string
          gerado_por_ia?: boolean
          id?: string
          id_area?: string
          id_cliente?: string
          informacao_conteudo?: string | null
          informacao_status?: string
          mes?: number
          receita_conteudo?: string | null
          receita_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metodo_area_ciclos_id_area_fkey"
            columns: ["id_area"]
            isOneToOne: false
            referencedRelation: "metodo_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      metodo_areas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          id_cliente: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          id_cliente: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          id_cliente?: string
          nome?: string
        }
        Relationships: []
      }
      metodo_copilotos: {
        Row: {
          colaborador_id: string | null
          colaborador_nome: string | null
          created_at: string
          funcao: string | null
          id: string
          id_cliente: string
          nome: string
          origem: string
          skill_documento: string | null
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          colaborador_id?: string | null
          colaborador_nome?: string | null
          created_at?: string
          funcao?: string | null
          id?: string
          id_cliente: string
          nome: string
          origem?: string
          skill_documento?: string | null
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          colaborador_id?: string | null
          colaborador_nome?: string | null
          created_at?: string
          funcao?: string | null
          id?: string
          id_cliente?: string
          nome?: string
          origem?: string
          skill_documento?: string | null
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metodo_copilotos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "cliente_colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      metodo_economias: {
        Row: {
          capacidade_nova: boolean
          created_at: string
          horas_mes: number
          id: string
          id_cliente: string
          metodo_valoracao: string | null
          natureza: string
          observacao: string | null
          origem: string
          recorrencia: string
          referencia: string
          tipo: string
          valor_mes: number
        }
        Insert: {
          capacidade_nova?: boolean
          created_at?: string
          horas_mes?: number
          id?: string
          id_cliente: string
          metodo_valoracao?: string | null
          natureza?: string
          observacao?: string | null
          origem?: string
          recorrencia?: string
          referencia: string
          tipo?: string
          valor_mes?: number
        }
        Update: {
          capacidade_nova?: boolean
          created_at?: string
          horas_mes?: number
          id?: string
          id_cliente?: string
          metodo_valoracao?: string | null
          natureza?: string
          observacao?: string | null
          origem?: string
          recorrencia?: string
          referencia?: string
          tipo?: string
          valor_mes?: number
        }
        Relationships: []
      }
      metodo_ferramentas: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          id_cliente: string
          nome: string
          para_que_serve: string | null
          url: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          id_cliente: string
          nome: string
          para_que_serve?: string | null
          url?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          id_cliente?: string
          nome?: string
          para_que_serve?: string | null
          url?: string | null
        }
        Relationships: []
      }
      metodo_gargalos: {
        Row: {
          area: string | null
          created_at: string
          descricao: string | null
          ferramentas: string | null
          frequencia: string | null
          horas_mes: number | null
          id: string
          id_cliente: string
          plano_ia: Json | null
          processo: string
          quem_executa: string | null
          status: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          descricao?: string | null
          ferramentas?: string | null
          frequencia?: string | null
          horas_mes?: number | null
          id?: string
          id_cliente: string
          plano_ia?: Json | null
          processo: string
          quem_executa?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          descricao?: string | null
          ferramentas?: string | null
          frequencia?: string | null
          horas_mes?: number | null
          id?: string
          id_cliente?: string
          plano_ia?: Json | null
          processo?: string
          quem_executa?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      metodo_guardioes: {
        Row: {
          cargo: string | null
          created_at: string
          email: string | null
          foto_url: string | null
          id: string
          id_cliente: string
          nome: string
          observacoes: string | null
          principal: boolean
          setor: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          id_cliente: string
          nome: string
          observacoes?: string | null
          principal?: boolean
          setor?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          foto_url?: string | null
          id?: string
          id_cliente?: string
          nome?: string
          observacoes?: string | null
          principal?: boolean
          setor?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      metodo_perfis_custo: {
        Row: {
          created_at: string
          custo_hora: number | null
          id: string
          id_cliente: string
          nome: string
          salario_mensal: number
        }
        Insert: {
          created_at?: string
          custo_hora?: number | null
          id?: string
          id_cliente: string
          nome: string
          salario_mensal?: number
        }
        Update: {
          created_at?: string
          custo_hora?: number | null
          id?: string
          id_cliente?: string
          nome?: string
          salario_mensal?: number
        }
        Relationships: []
      }
      metodo_sistemas: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          id_cliente: string
          integracoes: string | null
          nome: string
          plataforma: string | null
          print_url: string | null
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          id_cliente: string
          integracoes?: string | null
          nome: string
          plataforma?: string | null
          print_url?: string | null
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          id_cliente?: string
          integracoes?: string | null
          nome?: string
          plataforma?: string | null
          print_url?: string | null
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      modelos_monitorados: {
        Row: {
          ano_min: number | null
          ativo: boolean | null
          categoria: string | null
          criado_em: string | null
          fipe_base: number | null
          id: number
          modelo: string
        }
        Insert: {
          ano_min?: number | null
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          fipe_base?: number | null
          id?: number
          modelo: string
        }
        Update: {
          ano_min?: number | null
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          fipe_base?: number | null
          id?: number
          modelo?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: string
          content_type: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          content: string
          content_type?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_type?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      Pastas: {
        Row: {
          created_at: string
          id: number
          nome: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nome?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          id: number
          ip_hash: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          ip_hash?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          ip_hash?: string | null
        }
        Relationships: []
      }
      recursos_programa: {
        Row: {
          ativo: boolean
          categoria: string
          criado_em: string
          icone: string
          id: string
          ordem: number
          titulo: string
          url: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          criado_em?: string
          icone?: string
          id?: string
          ordem?: number
          titulo: string
          url: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          criado_em?: string
          icone?: string
          id?: string
          ordem?: number
          titulo?: string
          url?: string
        }
        Relationships: []
      }
      repositorio_vitorias: {
        Row: {
          area: string | null
          cadastrado_por: string | null
          cliente_nome: string | null
          created_at: string
          descricao: string | null
          evidencia_link: string | null
          evidencia_tipo: string
          evidencia_url: string | null
          id: string
          id_cliente: string | null
          motivo_reprovacao: string | null
          origem: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          cadastrado_por?: string | null
          cliente_nome?: string | null
          created_at?: string
          descricao?: string | null
          evidencia_link?: string | null
          evidencia_tipo?: string
          evidencia_url?: string | null
          id?: string
          id_cliente?: string | null
          motivo_reprovacao?: string | null
          origem?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          cadastrado_por?: string | null
          cliente_nome?: string | null
          created_at?: string
          descricao?: string | null
          evidencia_link?: string | null
          evidencia_tipo?: string
          evidencia_url?: string | null
          id?: string
          id_cliente?: string | null
          motivo_reprovacao?: string | null
          origem?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      reuniao_anexos: {
        Row: {
          created_at: string
          criado_por: string
          criado_por_admin: boolean
          id: string
          id_cliente: string
          id_reuniao: string
          mime: string | null
          nome: string
          tabela_origem: string
          tamanho: number | null
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          criado_por_admin?: boolean
          id?: string
          id_cliente: string
          id_reuniao: string
          mime?: string | null
          nome: string
          tabela_origem: string
          tamanho?: number | null
          tipo: string
          url: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          criado_por_admin?: boolean
          id?: string
          id_cliente?: string
          id_reuniao?: string
          mime?: string | null
          nome?: string
          tabela_origem?: string
          tamanho?: number | null
          tipo?: string
          url?: string
        }
        Relationships: []
      }
      reunioes_blackcrm: {
        Row: {
          acoes_cliente: Json | null
          acoes_mentor: Json | null
          ano: number | null
          cliente_compareceu: boolean | null
          cliente_email: string | null
          cliente_telefone: string | null
          codigo_cliente: number | null
          created_at: string | null
          criado_via: string | null
          data_reuniao: string | null
          duracao_minutos: number | null
          empresa: string | null
          fim_semana: string | null
          ganho: string | null
          horario: string | null
          id_cliente: string | null
          id_reuniao: string | null
          id_unico: string
          inicio_semana: string | null
          link_geminidoc: string | null
          link_gravacao: string | null
          link_meet: string | null
          mes: number | null
          metodo_match: string | null
          nome_empresa_formatado: string | null
          nps: number | null
          observacoes: string | null
          pessoa: string | null
          responsavel: string | null
          resumo: string | null
          resumo_json: string | null
          semana: number | null
          status_agendamento: string | null
          status_match: string | null
          tipo_reuniao: string | null
          transcricao: string | null
          transcricao_md: string | null
          updated_at: string | null
        }
        Insert: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          criado_via?: string | null
          data_reuniao?: string | null
          duracao_minutos?: number | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_gravacao?: string | null
          link_meet?: string | null
          mes?: number | null
          metodo_match?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          observacoes?: string | null
          pessoa?: string | null
          responsavel?: string | null
          resumo?: string | null
          resumo_json?: string | null
          semana?: number | null
          status_agendamento?: string | null
          status_match?: string | null
          tipo_reuniao?: string | null
          transcricao?: string | null
          transcricao_md?: string | null
          updated_at?: string | null
        }
        Update: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          criado_via?: string | null
          data_reuniao?: string | null
          duracao_minutos?: number | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico?: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_gravacao?: string | null
          link_meet?: string | null
          mes?: number | null
          metodo_match?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          observacoes?: string | null
          pessoa?: string | null
          responsavel?: string | null
          resumo?: string | null
          resumo_json?: string | null
          semana?: number | null
          status_agendamento?: string | null
          status_match?: string | null
          tipo_reuniao?: string | null
          transcricao?: string | null
          transcricao_md?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reunioes_galdino: {
        Row: {
          acoes_cliente: Json | null
          acoes_mentor: Json | null
          ano: number | null
          cliente_compareceu: boolean | null
          cliente_email: string | null
          cliente_telefone: string | null
          codigo_cliente: number | null
          created_at: string | null
          criado_via: string | null
          data_reuniao: string | null
          detalhes_reuniao: string | null
          duracao_minutos: number | null
          empresa: string | null
          fim_semana: string | null
          ganho: string | null
          horario: string | null
          id_cliente: string | null
          id_reuniao: string | null
          id_unico: string
          inicio_semana: string | null
          link_geminidoc: string | null
          link_gravacao: string | null
          link_meet: string | null
          mes: number | null
          metodo_match: string | null
          nome_cliente_formatado: string | null
          nome_empresa_formatado: string | null
          nps: number | null
          observacoes: string | null
          pessoa: string | null
          resumo: string | null
          semana: number | null
          status_agendamento: string | null
          status_match: string | null
          transcricao: string | null
          updated_at: string | null
        }
        Insert: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          criado_via?: string | null
          data_reuniao?: string | null
          detalhes_reuniao?: string | null
          duracao_minutos?: number | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico?: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_gravacao?: string | null
          link_meet?: string | null
          mes?: number | null
          metodo_match?: string | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          observacoes?: string | null
          pessoa?: string | null
          resumo?: string | null
          semana?: number | null
          status_agendamento?: string | null
          status_match?: string | null
          transcricao?: string | null
          updated_at?: string | null
        }
        Update: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          criado_via?: string | null
          data_reuniao?: string | null
          detalhes_reuniao?: string | null
          duracao_minutos?: number | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico?: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_gravacao?: string | null
          link_meet?: string | null
          mes?: number | null
          metodo_match?: string | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          observacoes?: string | null
          pessoa?: string | null
          resumo?: string | null
          semana?: number | null
          status_agendamento?: string | null
          status_match?: string | null
          transcricao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reunioes_mentoria: {
        Row: {
          acoes_cliente: Json | null
          acoes_mentor: Json | null
          ano: number | null
          cliente_compareceu: boolean | null
          cnpj: string | null
          codigo_cliente: number | null
          created_at: string | null
          data_reuniao: string | null
          empresa: string | null
          fim_semana: string | null
          ganho: string | null
          horario: string | null
          id_cliente: string | null
          id_reuniao: string | null
          id_unico: string
          inicio_semana: string | null
          mentor: string | null
          mes: number | null
          nome_cliente_formatado: string | null
          nome_empresa_formatado: string | null
          nps: number | null
          pessoa: string | null
          resumo: string | null
          semana: number | null
          transcricao: string | null
        }
        Insert: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cnpj?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          data_reuniao?: string | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico?: string
          inicio_semana?: string | null
          mentor?: string | null
          mes?: number | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          pessoa?: string | null
          resumo?: string | null
          semana?: number | null
          transcricao?: string | null
        }
        Update: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cnpj?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          data_reuniao?: string | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico?: string
          inicio_semana?: string | null
          mentor?: string | null
          mes?: number | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          pessoa?: string | null
          resumo?: string | null
          semana?: number | null
          transcricao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_mentoria_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      reunioes_mentoria_new: {
        Row: {
          acoes_cliente: Json | null
          acoes_mentor: Json | null
          ano: number | null
          cliente_compareceu: boolean | null
          cliente_email: string | null
          cliente_telefone: string | null
          cnpj: string | null
          codigo_cliente: number | null
          created_at: string | null
          criado_via: string | null
          data_reuniao: string | null
          duracao_minutos: number | null
          empresa: string | null
          fim_semana: string | null
          ganho: string | null
          gravada: boolean | null
          horario: string | null
          id_cliente: string | null
          id_reuniao: string | null
          id_unico: string
          inicio_semana: string | null
          link_geminidoc: string | null
          link_gravacao: string | null
          link_meet: string | null
          mentor: string | null
          mes: number | null
          nome_cliente_formatado: string | null
          nome_empresa_formatado: string | null
          nps: number | null
          observacoes: string | null
          pessoa: string | null
          resumo: string | null
          semana: number | null
          status_agendamento: string | null
          tem_transcricao: boolean | null
          transcricao: string | null
          updated_at: string | null
        }
        Insert: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          cnpj?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          criado_via?: string | null
          data_reuniao?: string | null
          duracao_minutos?: number | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          gravada?: boolean | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico?: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_gravacao?: string | null
          link_meet?: string | null
          mentor?: string | null
          mes?: number | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          observacoes?: string | null
          pessoa?: string | null
          resumo?: string | null
          semana?: number | null
          status_agendamento?: string | null
          tem_transcricao?: boolean | null
          transcricao?: string | null
          updated_at?: string | null
        }
        Update: {
          acoes_cliente?: Json | null
          acoes_mentor?: Json | null
          ano?: number | null
          cliente_compareceu?: boolean | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          cnpj?: string | null
          codigo_cliente?: number | null
          created_at?: string | null
          criado_via?: string | null
          data_reuniao?: string | null
          duracao_minutos?: number | null
          empresa?: string | null
          fim_semana?: string | null
          ganho?: string | null
          gravada?: boolean | null
          horario?: string | null
          id_cliente?: string | null
          id_reuniao?: string | null
          id_unico?: string
          inicio_semana?: string | null
          link_geminidoc?: string | null
          link_gravacao?: string | null
          link_meet?: string | null
          mentor?: string | null
          mes?: number | null
          nome_cliente_formatado?: string | null
          nome_empresa_formatado?: string | null
          nps?: number | null
          observacoes?: string | null
          pessoa?: string | null
          resumo?: string | null
          semana?: number | null
          status_agendamento?: string | null
          tem_transcricao?: boolean | null
          transcricao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_mentoria_new_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_formulario"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      roadmap_itens: {
        Row: {
          complexidade: string
          created_at: string
          fase: string
          id: string
          links: Json
          marco_feito: boolean
          marco_feito_data: string | null
          marco_kickoff: boolean
          marco_kickoff_data: string | null
          marco_mvp: boolean
          marco_mvp_data: string | null
          marco_teste: boolean
          marco_teste_data: string | null
          nome: string
          observacoes: string | null
          ordem: number
          prazo: string | null
          responsavel: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          complexidade?: string
          created_at?: string
          fase?: string
          id?: string
          links?: Json
          marco_feito?: boolean
          marco_feito_data?: string | null
          marco_kickoff?: boolean
          marco_kickoff_data?: string | null
          marco_mvp?: boolean
          marco_mvp_data?: string | null
          marco_teste?: boolean
          marco_teste_data?: string | null
          nome: string
          observacoes?: string | null
          ordem?: number
          prazo?: string | null
          responsavel?: string | null
          updated_at?: string
          valor?: string
        }
        Update: {
          complexidade?: string
          created_at?: string
          fase?: string
          id?: string
          links?: Json
          marco_feito?: boolean
          marco_feito_data?: string | null
          marco_kickoff?: boolean
          marco_kickoff_data?: string | null
          marco_mvp?: boolean
          marco_mvp_data?: string | null
          marco_teste?: boolean
          marco_teste_data?: string | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          prazo?: string | null
          responsavel?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      roadmap_projeto: {
        Row: {
          created_at: string
          id: string
          objetivo_estrategico: string | null
          proxima_entrega_data: string | null
          proxima_entrega_descricao: string | null
          status_geral: string
          updated_at: string
          visao_geral: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          objetivo_estrategico?: string | null
          proxima_entrega_data?: string | null
          proxima_entrega_descricao?: string | null
          status_geral?: string
          updated_at?: string
          visao_geral?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          objetivo_estrategico?: string | null
          proxima_entrega_data?: string | null
          proxima_entrega_descricao?: string | null
          status_geral?: string
          updated_at?: string
          visao_geral?: string | null
        }
        Relationships: []
      }
      survey_links: {
        Row: {
          codigo_cliente: string | null
          consultor: string
          created_at: string | null
          empresa: string | null
          id: string
          tipo_pesquisa: string
          token: string
          usado: boolean | null
        }
        Insert: {
          codigo_cliente?: string | null
          consultor: string
          created_at?: string | null
          empresa?: string | null
          id?: string
          tipo_pesquisa: string
          token: string
          usado?: boolean | null
        }
        Update: {
          codigo_cliente?: string | null
          consultor?: string
          created_at?: string | null
          empresa?: string | null
          id?: string
          tipo_pesquisa?: string
          token?: string
          usado?: boolean | null
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          codigo_cliente: string | null
          consultor: string
          created_at: string | null
          empresa: string | null
          id: string
          respostas: Json
          tipo_pesquisa: string
        }
        Insert: {
          codigo_cliente?: string | null
          consultor: string
          created_at?: string | null
          empresa?: string | null
          id?: string
          respostas?: Json
          tipo_pesquisa: string
        }
        Update: {
          codigo_cliente?: string | null
          consultor?: string
          created_at?: string | null
          empresa?: string | null
          id?: string
          respostas?: Json
          tipo_pesquisa?: string
        }
        Relationships: []
      }
      trilha_links: {
        Row: {
          link_url: string
          tarefa_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          link_url: string
          tarefa_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          link_url?: string
          tarefa_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      agendamentos_central: {
        Row: {
          atualizado_em: string | null
          cliente_compareceu: boolean | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          codigo_cliente: number | null
          consultor_nome: string | null
          criado_em: string | null
          data_reuniao: string | null
          duracao_minutos: number | null
          empresa: string | null
          horario: string | null
          id_cliente: string | null
          id_reuniao: string | null
          id_unico: string | null
          link_geminidoc: string | null
          link_gravacao: string | null
          link_meet: string | null
          observacoes: string | null
          origem: string | null
          status_agendamento: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      agent_describe_schema: { Args: { p_tabelas?: string[] }; Returns: Json }
      agent_run_sql: { Args: { p_sql: string }; Returns: Json }
      get_client_access_overview: {
        Args: never
        Returns: {
          data_cadastro_formulario: string
          data_criacao_auth: string
          email: string
          email_confirmed_at: string
          id_cliente: string
          id_entrada: number
          last_sign_in_at: string
          nivel_engajamento: string
          nome_cliente: string
          nome_empresa: string
          qtd_convites_reenviados: number
          sc: string
          senha_definida: boolean
          status_atual: string
          status_onboarding: string
          tem_auth_user: boolean
        }[]
      }
      guardiao_criar_convite: { Args: { p_type: string }; Returns: string }
      guardiao_get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          assessment_id: string
          assessment_type: string
          candidate_email: string
          candidate_name: string
          candidate_whatsapp: string
          completed_at: string
          expires_at: string
          id: string
          status: string
        }[]
      }
      guardiao_get_or_create_share_link: {
        Args: { p_type: string }
        Returns: string
      }
      guardiao_resolve_share: {
        Args: { p_token: string }
        Returns: {
          assessment_id: string
          description: string
          id_cliente: string
          title: string
          type: string
        }[]
      }
      has_auth_user: { Args: { p_id_cliente: string }; Returns: boolean }
      horarios_ocupados_consultor: {
        Args: { p_data: string; p_slug: string }
        Returns: {
          horario: string
        }[]
      }
      horarios_ocupados_consultor_intervalo: {
        Args: { p_from: string; p_slug: string; p_to: string }
        Returns: {
          data_reuniao: string
          horario: string
        }[]
      }
      hub_pmc_distribuicao: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_mentor: { Args: never; Returns: boolean }
      proxy_claude: {
        Args: {
          max_tokens?: number
          messages?: Json
          model?: string
          system_prompt?: string
        }
        Returns: Json
      }
      set_cliente_avatar: { Args: { p_avatar_url: string }; Returns: undefined }
      update_minha_moeda: { Args: { nova_moeda: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

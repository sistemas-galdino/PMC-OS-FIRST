# Black Eagle — PMC (Programa Multiplicador de Crescimento)

---

# 1. Identidade

**Empresa:** Black Eagle
**Produto:** PMC — Programa Multiplicador de Crescimento

Programa premium de aceleração empresarial para empresários que desejam:

* Escalar receita
* Implementar IA no negócio
* Estruturar marketing e tráfego
* Melhorar posicionamento
* Criar campanhas previsíveis

---

# 2. Estrutura Organizacional

## 2.1 Liderança

* Rafael Galdino — Idealizador e líder estratégico
* Realiza reuniões individuais com clientes
* Responsável por direcionamento macro

## 2.2 Mentores

Total: 6 mentores disponíveis

* 2 Mentores de Inteligência Artificial
* 1 Mentor de Tráfego Pago
* 1 Mentor de Posicionamento de Marca
* 1 Mentor de Campanhas de Marketing
* (1 mentor adicional conforme estrutura atual)

---

# 3. Entregas Oficiais do Programa

Todo cliente PMC tem direito a:

## 3.1 Reuniões Estratégicas

* 4 reuniões com Rafael Galdino (1 por trimestre)
* 3 reuniões com cada mentor
* 3 reuniões de implementação Black CRM (opcional)

## 3.2 Acompanhamento Contínuo

* Tutoria contínua (acompanhamento permanente)
* 12 encontros "Multiplica Time" (quinzenais)
* Reuniões de grupo
* Grupo individual (WhatsApp exclusivo)
* Grupo de avisos

## 3.3 Infraestrutura

* Acesso completo à área de membros
* Acesso à agenda de Rafael (liberado após onboarding)
* Black CRM (opcional, pode ter custo adicional)

---

# 4. Fluxo de Aquisição

## 4.1 Evento de Entrada

Evento presencial de 2 dias:

**Inteligência Artificial para Negócios (IA para Negócios)**

* Público: Empresários
* Evento geralmente gratuito
* Segundo dia contém pitch do PMC
* PMC é programa pago

---

# 5. Entrada Formal no Programa

Após pagamento (total ou parcial):

1. Cliente recebe Google Forms
2. Respostas vão para Google Sheets
3. Automação via n8n envia dados para Supabase
4. Registro criado na tabela `clientes_formulario`
5. Dados estruturados replicados para `clientes_entrada`

---

# 6. Arquitetura de Dados

## 6.1 Tabela: clientes_formulario

Origem: Google Forms
Tipo: Dados brutos
Fonte primária de cadastro

## 6.2 Tabela: clientes_entrada

Origem: Automação a partir de clientes_formulario
Tipo: Dados limpos e estruturados
Obrigatória para operação interna

Regra obrigatória:

> Nenhum cliente pode operar sem registro válido em clientes_entrada.

---

# 7. Onboarding (Reunião SC — Sucesso do Cliente)

Primeira reunião oficial do cliente.

## 7.1 Objetivos do Onboarding

* Apresentar programa e jornada completa
* Alinhar dores e expectativas
* Explicar entregas do programa
* Explicar funcionamento dos mentores
* Alinhar regras e acordos
* Apresentar Black CRM (opcional)

## 7.2 Ações Operacionais do Onboarding

Durante ou após onboarding:

* Liberar acesso à área de membros
* Liberar agenda de Rafael
* Adicionar no grupo individual
* Adicionar no grupo de avisos
* Enviar formulário de liberação de acessos
* Gerar código exclusivo do cliente

---

# 8. Código do Cliente

Cada cliente recebe um código único no onboarding.

Funções do código:

* Identificação oficial do cliente
* Uso obrigatório no agendamento de reuniões
* Chave de relacionamento entre tabelas
* Base das automações

Regra crítica:

> Nenhuma reunião pode ser registrada sem código válido.

---

# 9. Reunião com Rafael Galdino

Normalmente segunda reunião do cliente.

Objetivos:

* Diagnóstico estratégico
* Direcionamento prioritário
* Definição de ações iniciais
* Indicação de mentor adequado
* Delegação de tarefas

---

# 10. Reuniões com Mentores

## 10.1 Agendamento

* Feito via Google Agenda
* Cliente informa código em campo específico
* Agenda enviada pelo Sucesso do Cliente

## 10.2 Registro Automático

Tabela: `reuniao_mentoria`
Banco: Supabase
Automação: n8n

Campos inseridos automaticamente no agendamento:

* Mês
* Semana
* Mentor
* Empresa
* Nome participante
* Data da reunião
* ID da reunião
* Início da semana
* Fim da semana
* ID cliente
* Código cliente

Identificação do cliente depende exclusivamente do código informado.

---

# 11. Pós-Reunião (Processamento)

Após finalização:

1. Reunião é transcrita
2. Transcrição é processada
3. Automação atualiza mesma linha em `reuniao_mentoria` com:

* Transcrição
* Resumo
* Ações definidas
* Informações estratégicas

Regra:

> Reunião só é considerada completa após processamento da transcrição.

---

# 12. Regras Estruturais Obrigatórias

1. Supabase é a fonte da verdade.
2. Não criar reuniões sem cliente válido.
3. Código do cliente é obrigatório para qualquer operação.
4. Clientes devem existir em clientes_formulario e clientes_entrada.
5. Nenhuma reunião pode ultrapassar o limite contratado.
6. Dados de reunião devem ser enriquecidos após transcrição.
7. Automações via n8n são parte crítica da arquitetura.

---

# 13. Dependências Técnicas

* Google Forms
* Google Sheets
* Google Agenda
* n8n
* Supabase
* WhatsApp (grupos)
* Área de membros (plataforma interna)
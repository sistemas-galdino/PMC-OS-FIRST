// Central de Atendimentos do time de Sucesso do Cliente.
// É a MESMA página da central dos consultores, parametrizada por equipe: as
// agendas, os agendamentos e a rotulagem saem separados (ver EQUIPE_CONFIG em
// @/lib/atendimentos). Rota irmã em vez de :param pra manter a chave de RBAC
// própria (`central-sucesso-cliente`) e os links compartilháveis.
import CentralAtendimentosPage from "./central-atendimentos"

export default function CentralSucessoClientePage() {
  return <CentralAtendimentosPage equipe="sucesso_cliente" />
}

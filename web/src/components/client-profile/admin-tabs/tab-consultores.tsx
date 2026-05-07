import { EmptyTabPlaceholder } from "./_placeholder"

export default function TabConsultores(_props: { clientId: string }) {
  return (
    <EmptyTabPlaceholder
      titulo="Consultores"
      descricao="Mentores designados ao cliente, histórico de reuniões com cada um e próximas datas agendadas."
    />
  )
}

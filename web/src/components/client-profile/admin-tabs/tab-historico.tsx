import { EmptyTabPlaceholder } from "./_placeholder"

export default function TabHistorico(_props: { clientId: string }) {
  return (
    <EmptyTabPlaceholder
      titulo="Histórico"
      descricao="Linha do tempo completa de eventos do cliente — entradas, mudanças de status, marcos e interações importantes."
    />
  )
}

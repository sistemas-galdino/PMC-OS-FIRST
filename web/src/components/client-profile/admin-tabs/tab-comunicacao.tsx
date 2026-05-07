import { EmptyTabPlaceholder } from "./_placeholder"

export default function TabComunicacao(_props: { clientId: string }) {
  return (
    <EmptyTabPlaceholder
      titulo="Comunicação"
      descricao="Canais e histórico de mensagens trocadas com o cliente — email, WhatsApp, ligações."
    />
  )
}

import { EmptyTabPlaceholder } from "./_placeholder"

export default function TabPerfil(_props: { clientId: string }) {
  return (
    <EmptyTabPlaceholder
      titulo="Perfil"
      descricao="Dados básicos do cliente — nome, empresa, contato, código, status no programa."
    />
  )
}

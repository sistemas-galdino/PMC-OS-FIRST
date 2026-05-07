import { EmptyTabPlaceholder } from "./_placeholder"

export default function TabAtividades(_props: { clientId: string }) {
  return (
    <EmptyTabPlaceholder
      titulo="Atividades"
      descricao="Lista de atividades em aberto do cliente. Conteúdo a ser especificado."
    />
  )
}

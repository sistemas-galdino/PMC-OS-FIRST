import MentoresPage from "@/pages/mentores"

// Visão geral (admin) das reuniões das CS: a mesma página do Time de
// Consultores, filtrada por equipe='sucesso_cliente'.
export default function ReunioesCSAdminPage({ isAdmin = false }: { isAdmin?: boolean }) {
  return <MentoresPage isAdmin={isAdmin} equipe="sucesso_cliente" />
}

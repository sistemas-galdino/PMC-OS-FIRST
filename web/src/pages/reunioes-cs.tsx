import ClientReunioesPage from "@/pages/client-reunioes"
import type { Session } from "@supabase/supabase-js"

// Reuniões com o Sucesso do Cliente: mesma lista dos consultores, filtrada
// por equipe='sucesso_cliente' (as do link /atendimento nas agendas de CS).
export default function ReunioesCSPage(props: { session?: Session; clientId?: string }) {
  return <ClientReunioesPage {...props} equipe="sucesso_cliente" />
}

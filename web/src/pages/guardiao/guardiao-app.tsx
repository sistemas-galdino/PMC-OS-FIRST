import { Routes, Route, Navigate } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { GuardiaoProvider } from "@/lib/guardiao"

import Painel from "./painel"
import Setores from "./setores"
import SetorDetalhe from "./setor-detalhe"
import Tarefas from "./tarefas"
import Vitorias from "./vitorias"
import Relatorio from "./relatorio"
import Jornada from "./jornada"
import FaseDetalhe from "./fase-detalhe"
import Agenda from "./agenda"
import Evidencias from "./evidencias"
import Apoio from "./apoio"
import Gargalos from "./gargalos"
import Projetos from "./projetos"
import ProjetoDetalhe from "./projeto-detalhe"
import Biblioteca from "./biblioteca"
import Feedbacks from "./feedbacks"
import PromptsMetodologia from "./prompts-metodologia"
import PromptCompleto from "./prompt-completo"
import Apresentacao from "./apresentacao"

// Ponto de entrada do Sistema Operacional do Guardião de IA.
// Montado em App.tsx na rota /guardiao/*; envolve tudo no GuardiaoProvider
// (que resolve o cliente, roda o RPC de bootstrap e carrega o State do Supabase).
export function GuardiaoApp({ session, isAdmin }: { session: Session; isAdmin: boolean }) {
  return (
    <GuardiaoProvider session={session} isAdmin={isAdmin}>
      <Routes>
        <Route index element={<Painel />} />
        <Route path="setores" element={<Setores />} />
        <Route path="setores/:id" element={<SetorDetalhe />} />
        <Route path="tarefas" element={<Tarefas />} />
        <Route path="vitorias" element={<Vitorias />} />
        <Route path="relatorio" element={<Relatorio />} />
        <Route path="jornada" element={<Jornada />} />
        <Route path="fases/:num" element={<FaseDetalhe />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="evidencias" element={<Evidencias />} />
        <Route path="apoio" element={<Apoio />} />
        <Route path="gargalos" element={<Gargalos />} />
        <Route path="projetos" element={<Projetos />} />
        <Route path="projetos/:id" element={<ProjetoDetalhe />} />
        <Route path="biblioteca" element={<Biblioteca />} />
        <Route path="feedbacks" element={<Feedbacks />} />
        <Route path="prompts-metodologia" element={<PromptsMetodologia />} />
        <Route path="prompt-completo" element={<PromptCompleto />} />
        <Route path="apresentacao" element={<Apresentacao />} />
        <Route path="*" element={<Navigate to="/guardiao" replace />} />
      </Routes>
    </GuardiaoProvider>
  )
}

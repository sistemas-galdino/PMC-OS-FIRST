// Helpers compartilhados pelas 3 edge functions de encontros ao vivo
// (criar / atualizar / cancelar). Mantém a lógica de admin-check, de
// derivação de campos auxiliares (mes/ano/duracao/iso) e a config do
// calendário Google centralizada.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

// Calendário Google "[PMC] AO VIVO COM GALDINO" — owner dono@rafaelgaldino.com.br
export const AO_VIVO_CALENDAR_ID =
  "c_8189029e08d4e78a70d2760416fc6807322701143e6f132d0b3ba5c82b76f55c@group.calendar.google.com"
export const AO_VIVO_SUBJECT = "dono@rafaelgaldino.com.br"

export const TZ = "America/Fortaleza"
export const TZ_OFFSET = "-03:00"

export async function isAdminUser(
  supabaseAdmin: SupabaseClient,
  supabaseUrl: string,
  anonKey: string,
  jwt: string,
): Promise<boolean> {
  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })
  const { data: { user } } = await supabaseAsUser.auth.getUser()
  if (!user?.email) return false
  const { data: mentor } = await supabaseAdmin
    .from("mentores")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()
  return !!mentor
}

// "YYYY-MM-DD" → "DD/MM/YYYY"
export function formatDataEncontro(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export function calcularDuracaoMinutos(horaInicio: string, horaFim: string): number {
  const [hi, mi] = horaInicio.split(":").map(Number)
  const [hf, mf] = horaFim.split(":").map(Number)
  return (hf * 60 + mf) - (hi * 60 + mi)
}

export function dataHoraISO(data: string, horario: string): string {
  return `${data}T${horario.length === 5 ? horario + ":00" : horario}${TZ_OFFSET}`
}

export function camposDerivados(data: string) {
  const dataDate = new Date(data + "T00:00:00")
  return {
    mes: dataDate.getMonth() + 1,
    ano: dataDate.getFullYear(),
  }
}

export function nowIsoText(): string {
  // Mesmo formato usado pelos defaults do schema:
  // to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

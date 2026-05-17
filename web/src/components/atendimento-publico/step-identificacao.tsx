import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface IdentificacaoForm {
  nome: string
  email: string
  empresa: string
  telefone: string
  observacoes: string
}

interface Props {
  value: IdentificacaoForm
  onChange: (v: IdentificacaoForm) => void
}

export function StepIdentificacao({ value, onChange }: Props) {
  function set<K extends keyof IdentificacaoForm>(k: K, v: IdentificacaoForm[K]) {
    onChange({ ...value, [k]: v })
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seu nome *</Label>
        <Input
          value={value.nome}
          onChange={e => set("nome", e.target.value)}
          placeholder="Como podemos te chamar?"
          className="h-12"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email *</Label>
        <Input
          type="email"
          value={value.email}
          onChange={e => set("email", e.target.value)}
          placeholder="voce@empresa.com"
          className="h-12"
        />
        <p className="text-[11px] text-muted-foreground">O convite do Google Calendar será enviado para este email.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empresa</Label>
          <Input
            value={value.empresa}
            onChange={e => set("empresa", e.target.value)}
            placeholder="Nome da empresa"
            className="h-12"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Telefone</Label>
          <Input
            type="tel"
            value={value.telefone}
            onChange={e => set("telefone", e.target.value)}
            placeholder="(00) 00000-0000"
            className="h-12"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observações</Label>
        <Textarea
          value={value.observacoes}
          onChange={e => set("observacoes", e.target.value)}
          rows={3}
          placeholder="Quer adiantar algum contexto pro consultor? (opcional)"
        />
      </div>
    </div>
  )
}

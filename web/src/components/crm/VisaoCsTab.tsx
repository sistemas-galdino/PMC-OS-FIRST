// Aba "Visão da CS": percepção das CS sobre o cliente (crm_anotacoes_internas).
// Um componente só, usado no ClientDrawer do Customer Success e na Visão Admin
// (/cliente/:id) — o mesmo dado e a mesma query nos dois lugares.
import { useMemo, useRef, useState } from "react";
import { X, Pin, Image as ImageIcon, Send, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addAnotacaoInterna,
  isAdmin,
  removeAnotacaoInterna,
  updateAnotacaoInterna,
  useAnotacoesInternas,
  useNomeExibicao,
} from "@/lib/crm/storage";
import type { AnotacaoInterna, ProfileName } from "@/lib/crm/types";

export default function VisaoCsTab({ clientId }: { clientId: string }) {
  // O autor é quem está logado (mentores.nome do e-mail), nunca a "CS em foco"
  // do useProfile(): na coordenação ela é null — o que travava o Publicar na
  // Visão Admin — ou a CS escolhida no "vendo como", que assinaria por outra
  // pessoa. Sem sessão resolvida, não se publica em nome de ninguém.
  const nomeLogado = useNomeExibicao();
  const autor: ProfileName | null = nomeLogado || null;
  const [texto, setTexto] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const notas = useAnotacoesInternas(clientId);
  const notasOrdenadas = useMemo(() => {
    return [...notas].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [notas]);

  function publicar() {
    const t = texto.trim();
    if (!t && imagens.length === 0) return;
    if (!autor) return;
    void addAnotacaoInterna(clientId, t, autor, imagens)
      .then(() => {
        setTexto("");
        setImagens([]);
      })
      .catch((e: unknown) => {
        toast.error(`Não foi possível publicar: ${e instanceof Error ? e.message : String(e)}`);
      });
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const novos: string[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 1_500_000) {
        toast.error(`Imagem "${f.name}" > 1,5MB. Comprima antes de anexar.`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      novos.push(dataUrl);
    }
    setImagens((prev) => [...prev, ...novos].slice(0, 6));
  }

  return (
    <div className="space-y-4">
      {/* Nova anotação */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="text-sm font-semibold">Registrar visão da CS sobre o cliente</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Escreva livremente a sua percepção atual. Cada registro cria uma nova entrada no histórico — nada é sobrescrito. Use como referência (não obrigatório):
        </div>
        <ul className="text-[11px] text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4">
          <li>Momento atual do cliente</li>
          <li>Participação e envolvimento</li>
          <li>Principais dificuldades</li>
          <li>Pontos de atenção</li>
          <li>Possíveis riscos</li>
          <li>Evoluções recentes</li>
          <li>O que está travando o cliente</li>
          <li>Próximo ponto a acompanhar</li>
        </ul>
        <TextArea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: cliente respondeu rápido hoje, parece animado com a nova estratégia, mas ainda não enviou o material pendente..."
          rows={5}
        />
        {imagens.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagens.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`anexo ${i + 1}`}
                  className="h-16 w-16 object-cover rounded-md border border-border"
                />
                <button
                  onClick={() => setImagens(imagens.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border hover:border-primary"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Anexar imagens
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={publicar}
            disabled={!autor || (!texto.trim() && imagens.length === 0)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" /> Publicar anotação
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {notasOrdenadas.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            Nenhuma anotação registrada ainda.
          </div>
        )}
        {notasOrdenadas.map((n) => (
          <NotaCard key={n.id} nota={n} clienteId={clientId} autorAtual={autor} />
        ))}
      </div>
    </div>
  );
}

function NotaCard({
  nota,
  clienteId,
  autorAtual,
}: {
  nota: AnotacaoInterna;
  clienteId: string;
  autorAtual: ProfileName | null;
}) {
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(nota.texto);
  // No original a exceção era o nome "Maiara" (a coordenação). Aqui quem passa
  // por cima da autoria é o papel de admin do RBAC do PMC OS.
  const podeEditar = (!!autorAtual && autorAtual === nota.autor) || isAdmin();

  function salvar() {
    void updateAnotacaoInterna(clienteId, nota.id, { texto: texto.trim() })
      .then(() => setEditing(false))
      .catch((e: unknown) => {
        toast.error(`Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
      });
  }

  function excluir() {
    if (!confirm("Excluir esta anotação?")) return;
    void removeAnotacaoInterna(clienteId, nota.id).catch((e: unknown) => {
      toast.error(`Não foi possível excluir: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  function togglePin() {
    void updateAnotacaoInterna(clienteId, nota.id, { fixada: !nota.fixada }).catch((e: unknown) => {
      toast.error(`Não foi possível fixar: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        nota.fixada ? "border-primary/50 bg-primary/5" : "border-border bg-background"
      }`}
    >
      {editing ? (
        <>
          <TextArea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setTexto(nota.texto);
                setEditing(false);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
            >
              Salvar
            </button>
          </div>
        </>
      ) : (
        <>
          {nota.texto && (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{nota.texto}</div>
          )}
          {nota.imagens && nota.imagens.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {nota.imagens.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer">
                  <img
                    src={src}
                    alt={`anexo ${i + 1}`}
                    className="h-20 w-20 object-cover rounded-md border border-border"
                  />
                </a>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/80">{nota.autor}</span>
          {" · "}
          {new Date(nota.criado_em).toLocaleDateString("pt-BR")}
          {" · "}
          {new Date(nota.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {nota.atualizado_em && (
            <span className="ml-1 italic">
              · Editado em {new Date(nota.atualizado_em).toLocaleDateString("pt-BR")}{" "}
              {new Date(nota.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {podeEditar && !editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePin}
              className={`hover:text-foreground ${nota.fixada ? "text-primary" : ""}`}
              title={nota.fixada ? "Desafixar" : "Fixar"}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(true)} className="hover:text-foreground" title="Editar">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={excluir} className="hover:text-status-red" title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary ${props.className || ""}`}
    />
  );
}

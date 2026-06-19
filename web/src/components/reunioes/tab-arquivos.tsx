import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  FileTextIcon,
  LinkIcon,
  UploadIcon,
  ExternalLinkIcon,
  Trash2Icon,
  PlusIcon,
} from "@/components/ui/icons"

const STORAGE_BUCKET = "reunioes-anexos"
const ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx"

export type TabelaOrigem = "reunioes_mentoria_new" | "reunioes_blackcrm" | "reunioes_galdino"

interface Anexo {
  id: string
  tabela_origem: string
  id_reuniao: string
  id_cliente: string
  criado_por: string
  criado_por_admin: boolean
  tipo: "arquivo" | "link"
  url: string
  nome: string
  mime: string | null
  tamanho: number | null
  created_at: string
}

interface Props {
  idReuniao: string
  tabelaOrigem: TabelaOrigem
  idCliente: string | null
  isAdmin: boolean
}

function formatTamanho(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TabArquivos({ idReuniao, tabelaOrigem, idCliente, isAdmin }: Props) {
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkNome, setLinkNome] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    supabase
      .from("reuniao_anexos")
      .select("*")
      .eq("tabela_origem", tabelaOrigem)
      .eq("id_reuniao", idReuniao)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (alive) {
          setAnexos((data as Anexo[]) || [])
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [idReuniao, tabelaOrigem])

  async function handleUploadFile() {
    if (!file || !idCliente || !uid) return
    setBusy(true)
    setError(null)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${idCliente}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false })
    if (upErr) {
      setError(`Falha no upload: ${upErr.message}`)
      setBusy(false)
      return
    }
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    const { data, error: insErr } = await supabase
      .from("reuniao_anexos")
      .insert([
        {
          tabela_origem: tabelaOrigem,
          id_reuniao: idReuniao,
          id_cliente: idCliente,
          criado_por: uid,
          criado_por_admin: isAdmin,
          tipo: "arquivo",
          url: pub.publicUrl,
          nome: file.name,
          mime: file.type || null,
          tamanho: file.size,
        },
      ])
      .select()
      .single()
    if (insErr) {
      setError(insErr.message)
    } else if (data) {
      setAnexos((prev) => [data as Anexo, ...prev])
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    setBusy(false)
  }

  async function handleAddLink() {
    if (!linkUrl.trim() || !idCliente || !uid) return
    setBusy(true)
    setError(null)
    const href = linkUrl.trim()
    const { data, error: insErr } = await supabase
      .from("reuniao_anexos")
      .insert([
        {
          tabela_origem: tabelaOrigem,
          id_reuniao: idReuniao,
          id_cliente: idCliente,
          criado_por: uid,
          criado_por_admin: isAdmin,
          tipo: "link",
          url: href,
          nome: linkNome.trim() || href,
          mime: null,
          tamanho: null,
        },
      ])
      .select()
      .single()
    if (insErr) {
      setError(insErr.message)
    } else if (data) {
      setAnexos((prev) => [data as Anexo, ...prev])
      setLinkUrl("")
      setLinkNome("")
    }
    setBusy(false)
  }

  async function handleDelete(a: Anexo) {
    if (!confirm("Remover este anexo?")) return
    const { error: delErr } = await supabase.from("reuniao_anexos").delete().eq("id", a.id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    setAnexos((prev) => prev.filter((x) => x.id !== a.id))
    // Limpeza best-effort do objeto no storage (deriva o path da URL publica)
    if (a.tipo === "arquivo") {
      const marker = `/${STORAGE_BUCKET}/`
      const i = a.url.indexOf(marker)
      if (i !== -1) {
        supabase.storage.from(STORAGE_BUCKET).remove([a.url.slice(i + marker.length)])
      }
    }
  }

  const labelFor = (a: Anexo) =>
    a.criado_por === uid ? "Você" : a.criado_por_admin ? "Consultor" : "Cliente"
  const canDelete = (a: Anexo) => a.criado_por === uid || isAdmin

  return (
    <div className="space-y-4">
      {/* Uploader: arquivo + link (disponivel pra todos; RLS garante a correcao) */}
      <Card className="border-dashed border-2 border-border/50 bg-card/30">
        <CardContent className="p-5 space-y-4">
          {!idCliente ? (
            <p className="text-xs text-muted-foreground">
              Esta reunião ainda não está vinculada a um cliente, então não é possível anexar arquivos.
            </p>
          ) : (
            <>
              {/* Arquivo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="font-bold text-xs uppercase tracking-wider gap-2 shrink-0"
                >
                  <UploadIcon className="size-4" />
                  Escolher arquivo
                </Button>
                {file && (
                  <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                    {file.name}
                  </span>
                )}
                <Button
                  size="sm"
                  type="button"
                  disabled={busy || !file}
                  onClick={handleUploadFile}
                  className="font-bold text-xs uppercase tracking-wider gap-2 shrink-0"
                >
                  <PlusIcon className="size-4" />
                  Enviar
                </Button>
              </div>

              <div className="h-px bg-border/40" />

              {/* Link */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Input
                  value={linkNome}
                  onChange={(e) => setLinkNome(e.target.value)}
                  placeholder="Nome (opcional)"
                  className="h-9 rounded-xl border-border bg-background sm:w-40"
                  disabled={busy}
                />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-9 rounded-xl border-border bg-background flex-1"
                  disabled={busy}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={busy || !linkUrl.trim()}
                  onClick={handleAddLink}
                  className="font-bold text-xs uppercase tracking-wider gap-2 shrink-0"
                >
                  <LinkIcon className="size-4" />
                  Adicionar link
                </Button>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="h-20 bg-card/40 rounded-2xl animate-pulse" />
      ) : anexos.length === 0 ? (
        <Card className="border-border bg-card/50 backdrop-blur-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground font-medium">Nenhum arquivo ou link ainda.</p>
          </CardContent>
        </Card>
      ) : (
        anexos.map((a) => (
          <Card
            key={a.id}
            className="border-border bg-card/50 backdrop-blur-md hover:border-primary/20 transition-colors"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                {a.tipo === "link" ? (
                  <LinkIcon className="size-5 text-primary" />
                ) : (
                  <FileTextIcon className="size-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-foreground truncate">{a.nome}</h4>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted/30 border border-border text-muted-foreground shrink-0">
                    {labelFor(a)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  {a.tipo === "arquivo" && a.tamanho ? ` · ${formatTamanho(a.tamanho)}` : ""}
                </p>
              </div>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider gap-2">
                  <ExternalLinkIcon className="size-4" />
                  Abrir
                </Button>
              </a>
              {canDelete(a) && (
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                  title="Remover"
                >
                  <Trash2Icon className="size-4" />
                </button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

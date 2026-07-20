// Parsing de links de vídeo (Vimeo / YouTube / arquivo direto) para embed.
// Cobre os formatos reais do Vimeo, inclusive vídeos NÃO LISTADOS, que trazem
// um hash de privacidade e só tocam se ele for repassado ao player (?h=...).

export type TipoVideo = "vimeo" | "youtube" | "arquivo"

export interface VideoInfo {
  tipo: TipoVideo
  id: string | null
  hash: string | null   // hash de privacidade do Vimeo (vídeos não listados)
  embedUrl: string
}

// vimeo.com/123 · vimeo.com/123/HASH · vimeo.com/123?h=HASH
// player.vimeo.com/video/123?h=HASH · channels/x/123 · groups/x/videos/123
// showcase/9/video/123
function parseVimeo(url: string): { id: string; hash: string | null } | null {
  const u = url.trim()
  if (!/vimeo\.com/i.test(u)) return null
  let m = u.match(/player\.vimeo\.com\/video\/(\d+)/i)
  let id = m?.[1] ?? null
  if (!id) {
    m = u.match(/vimeo\.com\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|showcase\/\d+\/video\/|video\/)?(\d+)/i)
    id = m?.[1] ?? null
  }
  if (!id) return null

  let hash: string | null = null
  const porQuery = u.match(/[?&]h=([A-Za-z0-9]+)/i)          // ?h=abc123
  if (porQuery) hash = porQuery[1]
  if (!hash) {
    const porCaminho = u.match(new RegExp(`${id}\\/([A-Za-z0-9]{6,})`))  // /123/abc123
    if (porCaminho) hash = porCaminho[1]
  }
  return { id, hash }
}

function parseYoutube(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)
  return m ? m[1] : null
}

export function parseVideo(url: string | null | undefined): VideoInfo | null {
  if (!url || !url.trim()) return null
  const u = url.trim()

  const vm = parseVimeo(u)
  if (vm) {
    return {
      tipo: "vimeo",
      id: vm.id,
      hash: vm.hash,
      // dnt=1: sem cookies de tracking do Vimeo
      embedUrl: `https://player.vimeo.com/video/${vm.id}${vm.hash ? `?h=${vm.hash}&dnt=1` : "?dnt=1"}`,
    }
  }

  const yt = parseYoutube(u)
  if (yt) {
    return { tipo: "youtube", id: yt, hash: null, embedUrl: `https://www.youtube.com/embed/${yt}` }
  }

  return { tipo: "arquivo", id: null, hash: null, embedUrl: u }
}

// Thumbnail: YouTube é direto por URL; Vimeo exige oEmbed (público, sem chave).
export function thumbnailImediata(url: string | null | undefined): string | null {
  const info = parseVideo(url)
  if (info?.tipo === "youtube" && info.id) return `https://img.youtube.com/vi/${info.id}/hqdefault.jpg`
  return null
}

export async function thumbnailVimeo(url: string): Promise<string | null> {
  const info = parseVideo(url)
  if (info?.tipo !== "vimeo" || !info.id) return null
  // Para não listados, o oEmbed precisa da URL com o hash.
  const alvo = info.hash ? `https://vimeo.com/${info.id}/${info.hash}` : `https://vimeo.com/${info.id}`
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(alvo)}&width=640`)
    if (!r.ok) return null
    const j = await r.json()
    return (j?.thumbnail_url as string) ?? null
  } catch {
    return null
  }
}

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon as ArrowLeft } from "@/components/ui/icons"
import ClientProfileAdmin from "@/pages/client-profile-admin"
import ClientProfileOperational from "@/pages/client-profile-operational"

type View = "admin" | "operacional"
const STORAGE_KEY = "pmc-client-profile-view"

function readInitialView(): View {
  if (typeof localStorage === "undefined") return "admin"
  const v = localStorage.getItem(STORAGE_KEY)
  return v === "operacional" ? "operacional" : "admin"
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [view, setView] = useState<View>(readInitialView)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view)
  }, [view])

  if (!id) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl"
          onClick={() => navigate("/clientes")}
        >
          <ArrowLeft className="size-4" />
          <span className="font-bold text-xs uppercase tracking-wider">Voltar</span>
        </Button>

        <div className="flex gap-1 rounded-xl bg-muted/20 border border-border p-1">
          <Button
            variant={view === "admin" ? "default" : "ghost"}
            size="sm"
            className="h-7 rounded-lg font-bold text-[11px] uppercase tracking-wider"
            onClick={() => setView("admin")}
          >
            Visão Admin
          </Button>
          <Button
            variant={view === "operacional" ? "default" : "ghost"}
            size="sm"
            className="h-7 rounded-lg font-bold text-[11px] uppercase tracking-wider"
            onClick={() => setView("operacional")}
          >
            Visão Operacional
          </Button>
        </div>
      </div>

      {view === "admin" ? (
        <ClientProfileAdmin clientId={id} />
      ) : (
        <ClientProfileOperational clientId={id} />
      )}
    </div>
  )
}

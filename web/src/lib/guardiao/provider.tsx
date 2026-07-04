// GuardiaoProvider: resolves the viewed client, bootstraps the OS row (RPC), loads the
// full State from Supabase into the in-memory store, and exposes { resolvedClientId, isAdmin }.
//
// Client resolution:
//   - admin viewing another company: ?cliente=<id_cliente> from the URL
//   - otherwise: the logged-in client's own session.user.id
// (matches clientes_entrada_new.id_cliente == auth.uid()).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { store } from "./store";
import { loadAll } from "./persistence";

interface GuardiaoContextValue {
  resolvedClientId: string | null;
  isAdmin: boolean;
}

const GuardiaoContext = createContext<GuardiaoContextValue>({
  resolvedClientId: null,
  isAdmin: false,
});

export function useGuardiaoContext(): GuardiaoContextValue {
  return useContext(GuardiaoContext);
}

interface GuardiaoProviderProps {
  session?: Session | null;
  isAdmin?: boolean;
  children: ReactNode;
}

export function GuardiaoProvider({ session, isAdmin = false, children }: GuardiaoProviderProps) {
  const clienteParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("cliente")
      : null;
  const clientId = (isAdmin && clienteParam) ? clienteParam : session?.user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setReady(false);
      return;
    }
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        await supabase.rpc("guardiao_ensure_os", { p_id_cliente: clientId });
        const next = await loadAll(clientId);
        if (cancelled) return;
        store.setResolvedClientId(clientId);
        store.hydrate(next);
        setResolvedClientId(clientId);
        setReady(true);
      } catch (err) {
        console.error("[GuardiaoProvider] falha ao carregar o Guardião OS:", err);
        if (!cancelled) {
          store.setResolvedClientId(clientId);
          setResolvedClientId(clientId);
          setReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm font-medium">Carregando o Guardião de IA…</p>
        </div>
      </div>
    );
  }

  return (
    <GuardiaoContext.Provider value={{ resolvedClientId, isAdmin }}>
      {children}
    </GuardiaoContext.Provider>
  );
}

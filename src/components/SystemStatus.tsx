import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "offline";

/**
 * Pequeno indicador no header que faz polling leve no Supabase
 * para mostrar se a conexão com o backend está ativa.
 */
export function SystemStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  async function ping() {
    setStatus((s) => (s === "online" ? "online" : "checking"));
    const t0 = performance.now();
    try {
      // HEAD-style count: sem dados, super barato e respeita RLS.
      const { error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      const elapsed = Math.round(performance.now() - t0);
      setLatency(elapsed);
      setLastCheck(new Date());
      setStatus(error ? "offline" : "online");
    } catch {
      setStatus("offline");
      setLatency(null);
      setLastCheck(new Date());
    }
  }

  useEffect(() => {
    ping();
    const id = setInterval(ping, 30_000);
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const dot =
    status === "online"
      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
      : status === "offline"
        ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
        : "bg-amber-400";

  const label =
    status === "online" ? "Online" : status === "offline" ? "Offline" : "Checando";

  const tooltip =
    `Supabase: ${label}` +
    (latency != null ? ` · ${latency}ms` : "") +
    (lastCheck ? ` · ${lastCheck.toLocaleTimeString("pt-BR")}` : "");

  return (
    <button
      type="button"
      onClick={ping}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5 text-xs backdrop-blur transition hover:bg-card",
        className,
      )}
    >
      {status === "checking" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      <span className="font-medium tracking-wide">{label}</span>
      {latency != null && status === "online" && (
        <span className="text-muted-foreground">{latency}ms</span>
      )}
    </button>
  );
}

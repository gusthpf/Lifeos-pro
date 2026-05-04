import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as AuthCtx from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import {
  Swords,
  Target,
  BookOpenText,
  Sparkles,
  Flame,
  Check,
  Loader2,
  Trophy,
  Zap,
  Brain,
  AlertTriangle,
  Terminal,
  Send,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Dumbbell,
  Pencil,
  BookMarked,
  ListTodo,
  Archive,
  Radar,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SystemStatus } from "@/components/SystemStatus";
import { ThemeToggle } from "@/components/ThemeToggle";
import { XPStatus } from "@/components/XPStatus";
import { CalendarTab, useTodayAppointmentsAlert } from "@/components/CalendarTab";
import { CalendarDays } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeOS - Pro Manager" },
      {
        name: "description",
        content:
          "Seu life coach pessoal: gerencie hábitos, metas de vida, reflexões e métricas de evolução em XP.",
      },
    ],
  }),
  component: LifeCoachApp,
});

type FrequencyType = "diario" | "semanal" | "mensal";
type Habit = {
  id: string;
  title: string;
  category: string | null;
  xp_reward: number | null;
  frequency_type: string | null;
  duration: number | null;
  target_per_period: number | null;
};
type GoalHorizon = "curto" | "medio" | "longo";
type Goal = {
  id: string;
  objective: string;
  horizon: string | null;
  status: string | null;
  created_at: string | null;
};

function normalizeHorizon(h: string | null | undefined): GoalHorizon {
  const s = (h ?? "").toLowerCase();
  if (/(curto|short)/.test(s)) return "curto";
  if (/(longo|long)/.test(s)) return "longo";
  return "medio";
}

function normalizeFrequency(f: string | null | undefined): FrequencyType {
  const s = (f ?? "").toLowerCase();
  if (s.startsWith("sem")) return "semanal";
  if (s.startsWith("men")) return "mensal";
  return "diario";
}
type JournalEntry = {
  id: string;
  content: string;
  sentiment: string | null;
  created_at: string | null;
};
type Profile = {
  id: string;
  full_name: string | null;
  level: number | null;
  xp_total: number | null;
  last_access: string | null;
};

const XP_PER_LEVEL = 1000;

/* ============ NOC DASHBOARD ============ */
function getBahiaDateISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function getNextDateISO(dateISO: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

// Returns ms until next 00:00 in America/Bahia.
function msUntilNextBahiaMidnight(): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bahia",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  let h = get("hour");
  if (h === 24) h = 0; // some impls return 24 for midnight
  const m = get("minute");
  const s = get("second");
  const elapsedMs = ((h * 60 + m) * 60 + s) * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return dayMs - elapsedMs + 250; // small cushion
}

// Hook: returns the current Bahia ISO date and updates exactly when 00:00 hits.
function useBahiaToday(): string {
  const [today, setToday] = useState<string>(getBahiaDateISO);
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    function schedule() {
      timeoutId = setTimeout(() => {
        setToday(getBahiaDateISO());
        schedule();
      }, msUntilNextBahiaMidnight());
    }
    schedule();
    return () => clearTimeout(timeoutId);
  }, []);
  return today;
}

/* ============ NOC DASHBOARD v2.0 — Adaptive Command Center ============ */
type SlaRow = {
  user_id: string;
  reference_date: string;
  realized_xp: number | string | null;
  waived_xp: number | string | null;
  uptime_percentage: number | string | null;
  system_status: string | null;
};

function SlaGauge({ value }: { value: number }) {
  // Circular SVG progress (0–100). Stroke color depends on tier.
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 80;
  const stroke = 14;
  const C = 2 * Math.PI * radius;
  const offset = C - (clamped / 100) * C;

  const tone =
    clamped < 50
      ? { stroke: "#ef4444", glow: "rgba(239,68,68,0.45)", label: "CRITICAL" }
      : clamped < 90
        ? { stroke: "#eab308", glow: "rgba(234,179,8,0.45)", label: "DEGRADED" }
        : { stroke: "#10b981", glow: "rgba(16,185,129,0.45)", label: "OPERATIONAL" };

  return (
    <div className="relative flex h-[220px] w-[220px] items-center justify-center">
      <svg width={220} height={220} className="-rotate-90">
        <circle
          cx={110}
          cy={110}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={110}
          cy={110}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={tone.stroke}
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 10px ${tone.glow})`,
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {clamped.toFixed(0)}
          <span className="text-2xl text-slate-500 dark:text-slate-400">%</span>
        </span>
        <span
          className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: tone.stroke }}
        >
          Uptime Humano
        </span>
        <span
          className="mt-2 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
          style={{ borderColor: tone.stroke, color: tone.stroke }}
        >
          {tone.label}
        </span>
      </div>
    </div>
  );
}

function SystemTicker({ uptime }: { uptime: number }) {
  const tier =
    uptime < 50
      ? {
          label: "SYSTEM STATUS: CRITICAL",
          bg: "bg-red-500/10 dark:bg-red-500/15",
          border: "border-red-500/40",
          dot: "bg-red-500",
          text: "text-red-700 dark:text-red-400",
          icon: <ShieldAlert className="h-4 w-4" />,
          pulse: "animate-pulse",
        }
      : uptime < 90
        ? {
            label: "SYSTEM STATUS: DEGRADED",
            bg: "bg-yellow-500/10 dark:bg-yellow-500/15",
            border: "border-yellow-500/40",
            dot: "bg-yellow-500",
            text: "text-yellow-700 dark:text-yellow-400",
            icon: <AlertCircle className="h-4 w-4" />,
            pulse: "",
          }
        : {
            label: "SYSTEM STATUS: OPERATIONAL",
            bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
            border: "border-emerald-500/40",
            dot: "bg-emerald-500",
            text: "text-emerald-700 dark:text-emerald-400",
            icon: <ShieldCheck className="h-4 w-4" />,
            pulse: "",
          };

  const now = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Bahia",
    hour12: false,
  });

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border ${tier.border} ${tier.bg} px-3 py-2 font-mono text-xs uppercase tracking-widest ${tier.text}`}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${tier.dot} ${tier.pulse}`} />
        {tier.icon}
        <span className="font-bold">{tier.label}</span>
      </span>
      <span className="opacity-70">
        UPTIME {uptime.toFixed(1)}% · {now} BHA
      </span>
    </div>
  );
}

function NocStatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {hint && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
          {hint}
        </div>
      )}
    </div>
  );
}

type IncidentCategory = {
  id: string;
  display_name: string;
  default_xp_waive: number | null;
};

function IncidentTicketDialog({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = AuthCtx.useAuth();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoadingCats(true);
      const { data, error } = await supabase
        .from("incident_categories" as any)
        .select("id, display_name, default_xp_waive")
        .order("display_name", { ascending: true });
      if (!active) return;
      if (error) {
        toast.error("Falha ao carregar categorias");
      } else {
        setCategories((data as unknown as IncidentCategory[] | null) ?? []);
      }
      setLoadingCats(false);
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const selected = categories.find((c) => c.id === categoryId);
  const xpWaived = selected?.default_xp_waive ?? 50;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Sessão expirada");
      return;
    }
    if (!categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (description.trim().length < 5) {
      toast.error("Descreva a justificativa técnica");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("incident_logs" as any).insert({
      user_id: user.id,
      category_id: categoryId,
      description: description.trim(),
      xp_waived: xpWaived,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Falha ao registrar ticket", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Ticket registrado. SLA recalculado com sucesso.");
    setDescription("");
    setCategoryId("");
    setOpen(false);
    onSubmitted();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
      >
        <ShieldAlert className="h-4 w-4" />
        Abrir Ticket de Downtime
      </Button>
      <DialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Ticket de Downtime
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Registre uma justificativa técnica. O SLA do dia será recalculado:
            <span className="font-mono"> Meta = 200 − XP justificado</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="incident-category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                id="incident-category"
                className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <SelectValue
                  placeholder={loadingCats ? "Carregando..." : "Selecione a categoria"}
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="incident-desc">Justificativa Técnica</Label>
            <Textarea
              id="incident-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o motivo do downtime e contexto operacional..."
              rows={4}
              className="resize-none border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            XP a justificar: <span className="font-bold">{xpWaived}</span>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Registrar ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RcaAlertBanner() {
  const { user } = AuthCtx.useAuth();
  const today = useBahiaToday();
  const [breachDate, setBreachDate] = useState<string | null>(null);
  const [breachUptime, setBreachUptime] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [rootCause, setRootCause] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const yest = new Date(today + "T12:00:00");
      yest.setDate(yest.getDate() - 1);
      const yIso = yest.toISOString().slice(0, 10);
      const { data } = await supabase
        .from("daily_sla_monitor" as any)
        .select("reference_date,uptime_percentage")
        .eq("user_id", user.id)
        .in("reference_date", [yIso, today])
        .order("reference_date", { ascending: false });
      if (!active) return;
      const rows = (data ?? []) as Array<{ reference_date: string; uptime_percentage: number }>;
      const breach = rows.find((r) => Number(r.uptime_percentage) < 50);
      if (breach) {
        // already filed?
        const { data: existing } = await supabase
          .from("rca_logs")
          .select("id")
          .eq("user_id", user.id)
          .eq("downtime_date", breach.reference_date)
          .maybeSingle();
        if (!existing) {
          setBreachDate(breach.reference_date);
          setBreachUptime(Number(breach.uptime_percentage));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, today]);

  async function submit() {
    if (!user || !breachDate || !rootCause || !actionPlan.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("rca_logs").insert({
      user_id: user.id,
      downtime_date: breachDate,
      sla_percentage: breachUptime,
      root_cause: rootCause,
      action_plan: actionPlan.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o RCA. Tente novamente mais tarde.");
      return;
    }
    toast.success("RCA registrado");
    setOpen(false);
    setDismissed(true);
    setBreachDate(null);
  }

  if (!breachDate || dismissed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50/80 px-4 py-2.5 text-left text-sm text-amber-900 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
        aria-label="Abrir formulário de RCA"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <span className="font-semibold">SLA crítico em {breachDate}</span>
          <span className="ml-2 opacity-80">
            ({breachUptime.toFixed(1)}% uptime). Sugerimos abrir um RCA.
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest">Abrir RCA →</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Análise de Causa Raiz (RCA)</DialogTitle>
            <DialogDescription>
              Documente o incidente para evitar recorrências.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Data do Incidente</Label>
              <Input value={breachDate} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Causa Raiz</Label>
              <Select value={rootCause} onValueChange={setRootCause}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a causa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cansaço">Cansaço</SelectItem>
                  <SelectItem value="Falta de Tempo">Falta de Tempo</SelectItem>
                  <SelectItem value="Procrastinação">Procrastinação</SelectItem>
                  <SelectItem value="Evento Externo">Evento Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plano de Ação</Label>
              <Textarea
                rows={4}
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="O que será feito para mitigar o problema?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={saving || !rootCause || !actionPlan.trim()}
              className="bg-[#545B62] text-white hover:bg-[#545B62]/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar RCA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NocDashboardV2() {
  const { user } = AuthCtx.useAuth();
  const [row, setRow] = useState<SlaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const today = useBahiaToday();

  async function load() {
    if (!user) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("daily_sla_monitor" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("reference_date", today)
      .maybeSingle();
    setRow((data as SlaRow | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, today]);

  // Realtime: any new workout / habit_log / todo / strategy refreshes the gauge.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`noc-v2-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workouts", filter: `user_id=eq.${user.id}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs", filter: `user_id=eq.${user.id}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_list", filter: `user_id=eq.${user.id}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "strategies", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const uptime = Number(row?.uptime_percentage ?? 0) || 0;
  const xpToday = Number(row?.realized_xp ?? 0) || 0;
  const status =
    row?.system_status ?? (uptime >= 90 ? "OPERATIONAL" : uptime >= 50 ? "DEGRADED" : "CRITICAL");

  return (
    <section
      className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-900 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:p-6"
      aria-label="NOC Dashboard v2.0"
    >
      <SystemTicker uptime={uptime} />

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
          aria-controls="noc-command-center-body"
        >
          <div className="flex-1">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.25em] text-slate-700 dark:text-slate-300">
              NOC // Command Center v2.0
            </h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-500">
              SLA gauge · {today} · TZ America/Bahia
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>
        <div className="ml-3 flex items-center gap-3">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <IncidentTicketDialog onSubmitted={load} />
        </div>
      </div>

      {expanded && (
        <div id="noc-command-center-body">
          <div className="mt-4 grid gap-4 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex justify-center lg:justify-start">
              <SlaGauge value={uptime} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <NocStatCard
                icon={<Activity className="h-3 w-3" />}
                label="Status"
                value={status}
                hint="Tier do dia"
              />
              <NocStatCard
                icon={<Zap className="h-3 w-3" />}
                label="XP Hoje"
                value={`+${xpToday}`}
                hint="Recompensa acumulada"
              />
              <NocStatCard
                icon={<Radar className="h-3 w-3" />}
                label="Probe"
                value={loading ? "..." : "60s"}
                hint="Auto-refresh + realtime"
              />
            </div>
          </div>

          <div className="mt-4">
            <NocDailyXpAuditLog />
          </div>
        </div>
      )}
    </section>
  );
}

type AuditEvent = {
  id: string;
  ts: string; // ISO timestamp
  source: "Treino" | "Hábito" | "To-do" | "Estratégia";
  title: string;
  xp: number;
};

function NocDailyXpAuditLog() {
  const { user } = AuthCtx.useAuth();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"7d" | "month" | "all">("7d");

  async function loadEvents() {
    if (!user) return;
    setLoading(true);
    const sinceIso = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: workouts },
      { data: habitLogs },
      { data: habits },
      { data: todos },
      { data: strategies },
    ] = await Promise.all([
      supabase
        .from("workouts")
        .select("id,workout_type,category,exercise_name,xp_earned,created_at")
        .eq("user_id", user.id)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false }),
      supabase
        .from("habit_logs")
        .select("id,habit_id,notes,completed_at,updated_at")
        .eq("user_id", user.id)
        .gte("completed_at", sinceIso.slice(0, 10))
        .order("completed_at", { ascending: false }),
      supabase.from("habits").select("id,title").eq("user_id", user.id),
      supabase
        .from("todo_list")
        .select("id,title,priority,completed_at,is_completed")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .not("completed_at", "is", null)
        .gte("completed_at", sinceIso)
        .order("completed_at", { ascending: false }),
      supabase
        .from("strategies")
        .select("id,title,is_completed,updated_at")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("updated_at", sinceIso)
        .order("updated_at", { ascending: false }),
    ]);

    const habitTitle = new Map<string, string>(
      (habits ?? []).map((h: any) => [h.id, h.title as string]),
    );

    const list: AuditEvent[] = [];
    (workouts ?? []).forEach((w: any) => {
      list.push({
        id: `w-${w.id}`,
        ts: w.created_at,
        source: "Treino",
        title:
          w.workout_type ||
          w.category ||
          w.exercise_name ||
          "Treino registrado",
        xp: Number(w.xp_earned) || 0,
      });
    });
    (habitLogs ?? []).forEach((h: any) => {
      list.push({
        id: `h-${h.id}`,
        ts: h.updated_at || `${h.completed_at}T12:00:00-03:00`,
        source: "Hábito",
        title:
          (h.habit_id && habitTitle.get(h.habit_id)) ||
          (typeof h.notes === "string" && h.notes.trim()) ||
          "Hábito concluído",
        xp: 30,
      });
    });
    (todos ?? []).forEach((t: any) => {
      const xp =
        t.priority === "Alta" ? 50 : t.priority === "Média" ? 30 : t.priority === "Baixa" ? 15 : 0;
      list.push({
        id: `t-${t.id}`,
        ts: t.completed_at,
        source: "To-do",
        title: t.title || "Tarefa concluída",
        xp,
      });
    });
    (strategies ?? []).forEach((s: any) => {
      list.push({
        id: `s-${s.id}`,
        ts: s.updated_at,
        source: "Estratégia",
        title: s.title || "Estratégia concluída",
        xp: 50,
      });
    });

    list.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    setEvents(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!user || !open) return;
    loadEvents();
    const ch = supabase
      .channel(`noc-audit-detail-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workouts", filter: `user_id=eq.${user.id}` },
        loadEvents,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs", filter: `user_id=eq.${user.id}` },
        loadEvents,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_list", filter: `user_id=eq.${user.id}` },
        loadEvents,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "strategies", filter: `user_id=eq.${user.id}` },
        loadEvents,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, open]);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === "7d") {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return events.filter((e) => new Date(e.ts) >= cutoff);
    }
    if (filter === "month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      return events.filter((e) => {
        const d = new Date(e.ts);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    return events;
  }, [events, filter]);

  const totalXp = filtered.reduce((acc, e) => acc + e.xp, 0);

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mo} ${hh}:${mm}`;
  };

  const filters: { id: "7d" | "month" | "all"; label: string }[] = [
    { id: "7d", label: "Últimos 7 dias" },
    { id: "month", label: "Este Mês" },
    { id: "all", label: "Log Completo" },
  ];

  return (
    <div
      className="border-t font-mono text-sm"
      style={{
        borderColor: "var(--audit-border)",
        background: "var(--audit-bg)",
        color: "var(--audit-fg)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-[11px] uppercase tracking-widest transition-colors"
        style={{ color: "var(--audit-accent)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--audit-surface)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span className="flex items-center gap-2">
          <History className="h-3.5 w-3.5" />
          NOC // DAILY XP AUDIT LOG
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4 pt-2">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="rounded border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors"
                style={{
                  borderColor:
                    filter === f.id ? "var(--audit-accent)" : "var(--audit-border)",
                  background:
                    filter === f.id ? "var(--audit-accent)" : "transparent",
                  color: filter === f.id ? "var(--audit-bg)" : "var(--audit-fg)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div
            className="overflow-hidden rounded border"
            style={{ borderColor: "var(--audit-border)" }}
          >
            <table className="w-full text-xs">
              <thead
                className="text-[10px] uppercase tracking-widest"
                style={{ background: "var(--audit-surface)", color: "var(--audit-accent)" }}
              >
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Quando</th>
                  <th className="px-3 py-2 text-left font-medium">Fonte</th>
                  <th className="px-3 py-2 text-left font-medium">Ação</th>
                  <th className="px-3 py-2 text-right font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center">
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center opacity-60"
                      style={{ color: "var(--audit-fg)" }}
                    >
                      Nenhum evento no período.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e, i) => (
                    <tr
                      key={e.id}
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid var(--audit-border)",
                      }}
                    >
                      <td className="whitespace-nowrap px-3 py-2 opacity-80">
                        {fmtDateTime(e.ts)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
                          style={{
                            borderColor: "var(--audit-border)",
                            color: "var(--audit-accent)",
                          }}
                        >
                          {e.source}
                        </span>
                      </td>
                      <td className="px-3 py-2 truncate max-w-[260px]" title={e.title}>
                        {e.title}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-semibold"
                        style={{ color: "var(--audit-accent)" }}
                      >
                        +{e.xp}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot
                  style={{ background: "var(--audit-surface)", color: "var(--audit-accent)" }}
                >
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-2 text-[10px] uppercase tracking-widest"
                    >
                      Total ({filtered.length} {filtered.length === 1 ? "evento" : "eventos"})
                    </td>
                    <td className="px-3 py-2 text-right font-bold">+{totalXp}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function NocPanel() {
  const { user } = AuthCtx.useAuth();
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [lastCheck, setLastCheck] = useState<string>("");
  const [logCount, setLogCount] = useState<number>(0);
  const [registering, setRegistering] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [trainingType, setTrainingType] = useState("");
  const [trainingCategory, setTrainingCategory] = useState<string>("Musculação");
  const [trainingFocus, setTrainingFocus] = useState("");
  const [trainingDuration, setTrainingDuration] = useState<string>("");
  const [trainingIntensity, setTrainingIntensity] = useState<string>("Moderada");
  const [trainingNotes, setTrainingNotes] = useState("");
  const today = useBahiaToday();

  async function probe() {
    setStatus("loading");
    // Accept ANY workout registered today (qualquer treino conta).
    const nextDay = getNextDateISO(today);
    const { data: workouts, error } = await supabase
      .from("workouts")
      .select("id")
      .gte("created_at", `${today}T00:00:00-03:00`)
      .lt("created_at", `${nextDay}T00:00:00-03:00`);
    const now = new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Bahia",
      hour12: false,
    });
    setLastCheck(now);
    if (error) {
      setStatus("offline");
      setLogCount(0);
      return;
    }
    const count = (workouts ?? []).length;
    setLogCount(count);
    setStatus(count > 0 ? "online" : "offline");
  }

  async function registerTraining() {
    if (!user) {
      toast.error("Sessão expirada", { description: "Faça login para registrar treino." });
      return;
    }
    const category = trainingCategory.trim();
    const focus = trainingFocus.trim();
    const duration = trainingDuration.trim();
    const intensity = trainingIntensity.trim();
    const extra = trainingNotes.trim();
    const customType = trainingType.trim();

    // Compose a rich notes string. Must contain "treino" or "muscul" to be detected by the NOC probe.
    const baseLabel = category || customType || "Treino";
    const parts: string[] = [`Treino: ${baseLabel}`];
    if (customType && customType.toLowerCase() !== category.toLowerCase()) {
      parts.push(`Tipo: ${customType}`);
    }
    if (focus) parts.push(`Foco: ${focus}`);
    if (duration) parts.push(`Duração: ${duration} min`);
    if (intensity) parts.push(`Intensidade: ${intensity}`);
    if (extra) parts.push(`Obs: ${extra}`);
    const notes = parts.join(" · ");

    setRegistering(true);
    // Try to attach to a Treino/Musculação habit; else null habit_id (notes still tags it).
    const trainingTitle = /(treino|muscul)/i;
    const { data: habits } = await supabase.from("habits").select("id,title");
    const match = (habits ?? []).find((h: any) => trainingTitle.test(h.title ?? ""));

    const { error } = await supabase.from("habit_logs").insert({
      user_id: user.id,
      completed_at: today,
      habit_id: match?.id ?? null,
      notes,
    });
    if (error) {
      setRegistering(false);
      toast.error("Falha ao registrar treino", { description: "Tente novamente mais tarde." });
      return;
    }

    // Also persist to workouts table → triggers +50 XP automatically on the backend
    const workoutType = customType || category || "Treino";
    const durationMin = parseInt(duration, 10);
    const { error: wErr } = await supabase.from("workouts").insert({
      user_id: user.id,
      workout_type: workoutType,
      category: "Treino",
      duration_minutes: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 0,
      xp_earned: 50,
      intensity_level: intensity || null,
      exercise_name: focus || null,
    });
    setRegistering(false);
    if (wErr) {
      toast.error("Treino registrado, mas falha ao computar XP", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("TREINO CONCLUÍDO: +50 XP de Performance Física", {
      description: notes,
    });
    setModalOpen(false);
    setTrainingType("");
    setTrainingFocus("");
    setTrainingDuration("");
    setTrainingNotes("");
    setTrainingCategory("Musculação");
    setTrainingIntensity("Moderada");
    await probe();
  }

  useEffect(() => {
    probe();
    const id = setInterval(probe, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // Realtime: refresh when workouts change for this user
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`noc-discipline-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workouts", filter: `user_id=eq.${user.id}` },
        probe,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isOnline = status === "online";
  const isOffline = status === "offline";
  const accentVar = isOnline ? "var(--noc-online)" : "var(--noc-offline)";
  const accentFgVar = isOnline ? "var(--noc-online-fg)" : "var(--noc-offline-fg)";

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-md border-2 font-mono text-sm noc-scanline ${
        isOffline ? "noc-blink" : ""
      }`}
      style={{
        borderColor: isOnline
          ? "var(--noc-online)"
          : isOffline
            ? "var(--noc-offline)"
            : "var(--border)",
        background: isOnline
          ? "var(--noc-online-bg)"
          : isOffline
            ? "var(--noc-offline-bg)"
            : "var(--card)",
        boxShadow: isOnline
          ? "var(--noc-online-glow)"
          : isOffline
            ? "var(--noc-offline-glow)"
            : "none",
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] uppercase tracking-widest"
        style={{
          borderColor: accentVar,
          color: accentFgVar,
        }}
      >
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: accentVar,
              boxShadow: `0 0 8px ${accentVar}`,
            }}
          />
          NOC // DISCIPLINE MONITOR
        </span>
        <span className="opacity-80">TZ: America/Bahia · {today}</span>
      </div>

      <div className="px-4 py-4">
        {status === "loading" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>$ probing habit_logs...</span>
          </div>
        ) : isOnline ? (
          <div className="space-y-1" style={{ color: accentFgVar }}>
            <div className="text-xs opacity-80">$ check --date {today}</div>
            <div className="text-lg font-bold tracking-wider sm:text-xl">
              ▲ SYSTEM ONLINE: DISCIPLINA ATIVA
            </div>
            <div className="text-xs opacity-80">
              {logCount} log{logCount === 1 ? "" : "s"} registrado{logCount === 1 ? "" : "s"} hoje ·
              last_probe={lastCheck}
            </div>
          </div>
        ) : (
          <div className="space-y-2" style={{ color: accentFgVar }}>
            <div className="text-xs opacity-80">$ check --date {today}</div>
            <div className="text-lg font-bold tracking-wider sm:text-xl">
              ✖ CRITICAL: UPTIME COMPROMETIDO. TREINO PENDENTE
            </div>
            <div className="text-xs opacity-80">
              0 logs registrados · last_probe={lastCheck} · auto_retry=60s
            </div>
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => setModalOpen(true)}
                disabled={!user}
                className="gap-2 font-mono uppercase tracking-wider"
                style={{
                  background: "var(--noc-offline)",
                  color: "var(--noc-btn-fg)",
                  border: "1px solid var(--noc-offline)",
                }}
              >
                <Dumbbell className="h-4 w-4" />
                Registrar Treino
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(o) => {
          if (!registering) setModalOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Treino</DialogTitle>
            <DialogDescription>
              Registre os detalhes do treino realizado hoje ({today}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="training-category">Categoria</Label>
                <Select value={trainingCategory} onValueChange={setTrainingCategory}>
                  <SelectTrigger id="training-category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Musculação">Musculação</SelectItem>
                    <SelectItem value="Cardio">Cardio</SelectItem>
                    <SelectItem value="Corrida">Corrida</SelectItem>
                    <SelectItem value="Funcional">Funcional</SelectItem>
                    <SelectItem value="Crossfit">Crossfit</SelectItem>
                    <SelectItem value="Yoga">Yoga</SelectItem>
                    <SelectItem value="Mobilidade">Mobilidade</SelectItem>
                    <SelectItem value="Esporte">Esporte</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="training-intensity">Intensidade</Label>
                <Select value={trainingIntensity} onValueChange={setTrainingIntensity}>
                  <SelectTrigger id="training-intensity">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leve">Leve</SelectItem>
                    <SelectItem value="Moderada">Moderada</SelectItem>
                    <SelectItem value="Intensa">Intensa</SelectItem>
                    <SelectItem value="Máxima">Máxima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-focus">Foco / Grupo Muscular</Label>
              <Input
                id="training-focus"
                placeholder="Ex.: Peito e Tríceps, Pernas, Costas…"
                value={trainingFocus}
                onChange={(e) => setTrainingFocus(e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="training-duration">Duração (min)</Label>
                <Input
                  id="training-duration"
                  type="number"
                  min={1}
                  placeholder="Ex.: 60"
                  value={trainingDuration}
                  onChange={(e) => setTrainingDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="training-type">Detalhe extra (opcional)</Label>
                <Input
                  id="training-type"
                  placeholder="Ex.: Treino A, ABC…"
                  value={trainingType}
                  onChange={(e) => setTrainingType(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-notes">Observações</Label>
              <Textarea
                id="training-notes"
                placeholder="Como foi a execução, sensações, PRs, ajustes…"
                value={trainingNotes}
                onChange={(e) => setTrainingNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={registering}>
              Cancelar
            </Button>
            <Button
              onClick={registerTraining}
              disabled={registering || !trainingCategory.trim()}
              className="gap-2"
            >
              {registering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Confirmar e Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NocAuditLog />
    </div>
  );
}

/* ============ NOC AUDIT LOG (v1.9) ============ */
type WorkoutRow = {
  id: string;
  user_id: string | null;
  workout_type: string | null;
  category: string | null;
  exercise_name: string | null;
  intensity_level: string | null;
  duration_minutes: number | null;
  xp_earned: number | null;
  created_at: string | null;
};

type AuditFilter = "7d" | "month" | "all";

function NocAuditLog() {
  const { user } = AuthCtx.useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AuditFilter>("all");

  useEffect(() => {
    if (!user || !open) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("workouts")
        .select(
          "id,user_id,workout_type,category,exercise_name,intensity_level,duration_minutes,xp_earned,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (active) {
        if (!error && data) setRows(data as WorkoutRow[]);
        setLoading(false);
      }
    })();
    const channel = supabase
      .channel(`noc-audit-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workouts", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setRows((prev) => [payload.new as WorkoutRow, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "workouts", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setRows((prev) => prev.filter((r) => r.id !== (payload.old as WorkoutRow).id));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, open]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    const now = Date.now();
    const cutoff =
      filter === "7d"
        ? now - 7 * 24 * 60 * 60 * 1000
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    return rows.filter((r) => r.created_at && new Date(r.created_at).getTime() >= cutoff);
  }, [rows, filter]);

  const totals = useMemo(() => {
    const minutes = filtered.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
    const xp = filtered.reduce((s, r) => s + (r.xp_earned ?? 0), 0);
    return { minutes, xp, sessions: filtered.length };
  }, [filtered]);

  const fmtUptime = (m: number) => {
    if (!m) return "0h 00m";
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${String(mm).padStart(2, "0")}m`;
  };
  const fmtTs = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mo}/${yy} ${hh}:${mi}`;
  };

  return (
    <div
      className="border-t font-mono text-sm"
      style={{
        borderColor: "var(--audit-border)",
        background: "var(--audit-bg)",
        color: "var(--audit-fg)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-[11px] uppercase tracking-widest transition-colors"
        style={{ color: "var(--audit-accent)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--audit-surface)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span className="flex items-center gap-2">
          <History className="h-3.5 w-3.5" />
          NOC // WORKOUT AUDIT LOG
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4 pt-2">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <KpiCard label="Uptime de Treino" value={fmtUptime(totals.minutes)} />
            <KpiCard label="Sessões Registradas" value={String(totals.sessions)} />
            <KpiCard label="XP Acumulado NOC" value={`+${totals.xp}`} accent />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["7d", "Últimos 7 dias"],
                ["month", "Este Mês"],
                ["all", "Log Completo"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className="rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors"
                style={{
                  borderColor: filter === k ? "var(--audit-accent)" : "var(--audit-border)",
                  background: filter === k ? "var(--audit-accent-soft)" : "transparent",
                  color: filter === k ? "var(--audit-accent)" : "var(--audit-fg-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tabela */}
          <div
            className="overflow-hidden rounded-sm border"
            style={{ borderColor: "var(--audit-border)" }}
          >
            {loading ? (
              <div
                className="flex items-center gap-2 px-3 py-6 text-xs"
                style={{ color: "var(--audit-fg-muted)" }}
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />$ fetching workouts...
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 px-3 py-10 text-center text-xs"
                style={{ color: "var(--audit-fg-muted)" }}
              >
                <Radar className="h-8 w-8 animate-pulse" style={{ color: "var(--audit-accent)" }} />
                <span>Aguardando telemetria de performance...</span>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead
                    className="sticky top-0 text-[10px] uppercase tracking-widest"
                    style={{
                      background: "var(--audit-surface)",
                      color: "var(--audit-fg-subtle)",
                    }}
                  >
                    <tr>
                      <th className="px-3 py-2 text-left font-normal">Timestamp</th>
                      <th className="px-3 py-2 text-left font-normal">Evento</th>
                      <th className="px-3 py-2 text-left font-normal">Duração</th>
                      <th className="px-3 py-2 text-right font-normal">Recompensa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const tag = r.workout_type || r.category || "TREINO";
                      const dur = r.duration_minutes ?? 0;
                      return (
                        <tr
                          key={r.id}
                          className="border-t"
                          style={{ borderColor: "var(--audit-border)" }}
                        >
                          <td className="px-3 py-2" style={{ color: "var(--audit-fg-muted)" }}>
                            {fmtTs(r.created_at)}
                          </td>
                          <td className="px-3 py-2">
                            <span style={{ color: "var(--audit-fg-subtle)" }}>
                              TREINO_DETECTADO
                            </span>{" "}
                            <span style={{ color: "var(--audit-accent)" }}>
                              · {tag.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px]"
                              style={{
                                borderColor: "var(--audit-border)",
                                background: "var(--audit-surface)",
                                color: "var(--audit-fg)",
                              }}
                            >
                              <Clock className="h-3 w-3" />
                              {dur > 0 ? `${dur} min` : "—"}
                            </span>
                          </td>
                          <td
                            className="px-3 py-2 text-right font-bold"
                            style={{ color: "var(--audit-accent)" }}
                          >
                            +{r.xp_earned ?? 0} XP
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-sm border px-3 py-2"
      style={{ borderColor: "var(--audit-border)", background: "var(--audit-surface)" }}
    >
      <div
        className="text-[10px] uppercase tracking-widest"
        style={{ color: "var(--audit-fg-subtle)" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 text-lg font-bold tracking-wider"
        style={{ color: accent ? "var(--audit-accent)" : "var(--audit-fg)" }}
      >
        {value}
      </div>
    </div>
  );
}

function LifeCoachApp() {
  const { profile, username, loading, user, signOut } = AuthCtx.useAuth();
  const navigate = useNavigate();
  useTodayAppointmentsAlert();
  const fullName = profile?.full_name?.trim() || username || "";
  const firstName = fullName ? fullName.split(/\s+/)[0] : "";
  const getTimeGreeting = () => {
    // Hora atual no fuso America/Bahia
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bahia",
      hour: "2-digit",
      hour12: false,
    }).format(new Date());
    const hour = parseInt(hourStr, 10);
    if (hour >= 5 && hour < 12) return { text: "bom dia", emoji: "☀️" };
    if (hour >= 12 && hour < 18) return { text: "boa tarde", emoji: "🌅" };
    return { text: "boa noite", emoji: "🌙" };
  };
  const greeting = (() => {
    if (loading || !user) return "Bem-vindo!";
    const { text, emoji } = getTimeGreeting();
    if (firstName) return `Olá ${firstName}, ${text} ${emoji}`;
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
    return `${capitalized} ${emoji}`;
  })();

  // Redirect unauthenticated users to /auth once we know there's no session
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen text-foreground">
      <Toaster theme="dark" position="top-center" richColors />
      <header className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Life Coach</h1>
              <p className="text-sm text-muted-foreground">Treine. Planeje. Reflita. Evolua.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SystemStatus />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/wiki">
                <BookMarked className="h-4 w-4" /> Wiki
              </Link>
            </Button>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
              >
                Sair
              </Button>
            )}
          </div>
        </div>
        <div
          className="mt-6 rounded-lg border border-border/60 bg-card/60 px-5 py-4 backdrop-blur flex flex-wrap items-center justify-between gap-4"
          style={{ boxShadow: "var(--shadow-elegant, 0 4px 20px -8px oklch(0 0 0 / 0.3))" }}
          aria-live="polite"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Sessão</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {greeting}
              {loading && (
                <Loader2 className="ml-2 inline h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </p>
          </div>
          {user && <XPStatus />}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <NocDashboardV2 />
        <NocPanel />
        <ManagementBar />
        <Tabs defaultValue="dojo" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 bg-card/60 backdrop-blur border border-border h-auto md:h-12">
            <TabsTrigger value="dojo" className="gap-2">
              <Swords className="h-4 w-4" /> Dojo
            </TabsTrigger>
            <TabsTrigger value="estrategia" className="gap-2">
              <Target className="h-4 w-4" /> Estratégia
            </TabsTrigger>
            <TabsTrigger value="todo" className="gap-2">
              <ListTodo className="h-4 w-4" /> To-do
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="reflexao" className="gap-2">
              <BookOpenText className="h-4 w-4" /> Reflexão
            </TabsTrigger>
            <TabsTrigger value="metricas" className="gap-2">
              <Trophy className="h-4 w-4" /> Métricas
            </TabsTrigger>
            <TabsTrigger value="nexus" className="gap-2">
              <Terminal className="h-4 w-4" /> Nexus
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dojo" className="mt-6">
            <DojoTab />
          </TabsContent>
          <TabsContent value="estrategia" className="mt-6">
            <StrategyTab />
          </TabsContent>
          <TabsContent value="todo" className="mt-6">
            <TodoTab />
          </TabsContent>
          <TabsContent value="calendario" className="mt-6">
            <div className="-mx-6 px-2 sm:px-6">
              <CalendarTab />
            </div>
          </TabsContent>
          <TabsContent value="reflexao" className="mt-6">
            <ReflectionTab />
          </TabsContent>
          <TabsContent value="metricas" className="mt-6">
            <MetricsTab />
          </TabsContent>
          <TabsContent value="nexus" className="mt-6">
            <NexusTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ============ DOJO ============ */
function DojoTab() {
  const { user } = AuthCtx.useAuth();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<Habit | null>(null);

  const today = useBahiaToday();

  const reload = async () => {
    const [{ data: h }, { data: logs }] = await Promise.all([
      supabase
        .from("habits")
        .select("id,title,category,xp_reward,frequency_type,duration,target_per_period")
        .order("created_at", { ascending: false }),
      supabase.from("habit_logs").select("habit_id").eq("completed_at", today),
    ]);
    setHabits((h ?? []) as Habit[]);
    setCompletedToday(new Set((logs ?? []).map((l: any) => l.habit_id).filter(Boolean)));
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // Realtime: react to inserts/updates/deletes on habits and habit_logs
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`dojo-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Habit;
            setHabits((curr) => {
              const list = curr ?? [];
              if (list.some((h) => h.id === row.id)) return list;
              return [row, ...list];
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Habit;
            setHabits((curr) => (curr ?? []).map((h) => (h.id === row.id ? { ...h, ...row } : h)));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as any)?.id;
            if (oldId) setHabits((curr) => (curr ?? []).filter((h) => h.id !== oldId));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "habit_logs", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const row = payload.new as { habit_id: string; completed_at: string };
          if (row?.completed_at === today && row.habit_id) {
            setCompletedToday((s) => new Set(s).add(row.habit_id));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, today]);

  async function checkIn(habit: Habit) {
    if (completedToday.has(habit.id)) return;
    if (!user) {
      toast.error("Sessão expirada", { description: "Faça login para registrar check-in." });
      return;
    }
    setPending(habit.id);
    const { error } = await supabase
      .from("habit_logs")
      .insert({ habit_id: habit.id, completed_at: today, user_id: user.id });
    setPending(null);
    if (error) {
      toast.error("Falha no check-in", { description: "Tente novamente mais tarde." });
      return;
    }
    setCompletedToday((s) => new Set(s).add(habit.id));
    toast.success(`+${habit.xp_reward ?? 10} XP`, {
      description: `"${habit.title}" concluído!`,
    });
  }

  async function deleteHabit(habit: Habit) {
    if (!confirm(`Excluir o hábito "${habit.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(habit.id);
    const { error } = await supabase.from("habits").delete().eq("id", habit.id);
    setDeleting(null);
    if (error) {
      toast.error("Falha ao excluir", { description: "Tente novamente mais tarde." });
      return;
    }
    setHabits((curr) => (curr ?? []).filter((h) => h.id !== habit.id));
    setCompletedToday((s) => {
      const n = new Set(s);
      n.delete(habit.id);
      return n;
    });
    toast.success("Hábito removido", { description: `"${habit.title}" excluído do dojo.` });
  }

  if (habits === null) return <SkeletonGrid />;

  const tzNotice = (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <span>
        Hábitos com frequência &gt; 1 dia são resetados automaticamente às{" "}
        <span className="font-mono text-foreground">00:00 (Horário de Salvador)</span>.
      </span>
    </div>
  );

  if (habits.length === 0)
    return (
      <>
        {tzNotice}
        <EmptyState
          icon={<Swords className="h-8 w-8" />}
          title="Nenhum hábito no dojo"
          description="Vamos começar inserindo um novo hábito no botão Novo Hábito."
        />
      </>
    );

  return (
    <>
      {tzNotice}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {habits.map((habit) => {
          const done = completedToday.has(habit.id);
          const isPending = pending === habit.id;
          return (
            <Card
              key={habit.id}
              className="relative overflow-hidden border-border bg-card/70 backdrop-blur transition-all hover:border-primary/50"
              style={{ boxShadow: done ? "var(--shadow-glow)" : "var(--shadow-card)" }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">
                    {habit.title}
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Zap className="h-3 w-3" /> {habit.xp_reward ?? 10}
                  </Badge>
                </div>
                {habit.category && (
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {habit.category}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => checkIn(habit)}
                    disabled={done || isPending}
                    className="flex-1"
                    style={
                      done
                        ? {
                            background: "var(--gradient-primary)",
                            color: "var(--primary-foreground)",
                          }
                        : undefined
                    }
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : done ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Concluído hoje
                      </>
                    ) : (
                      <>
                        <Flame className="mr-2 h-4 w-4" /> Check-in
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditing(habit)}
                    aria-label={`Editar ${habit.title}`}
                    title="Editar hábito"
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteHabit(habit)}
                    disabled={deleting === habit.id}
                    aria-label={`Excluir ${habit.title}`}
                    title="Excluir hábito"
                    className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deleting === habit.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <EditHabitModal
        habit={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={(updated) =>
          setHabits((curr) => (curr ?? []).map((h) => (h.id === updated.id ? updated : h)))
        }
      />
    </>
  );
}

/* ============ ESTRATÉGIA ============ */
function StrategyTab() {
  const { user } = AuthCtx.useAuth();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: "complete" | "delete" } | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);

  const reload = async () => {
    const { data } = await supabase
      .from("life_goals")
      .select("id,objective,horizon,status,created_at")
      .order("created_at", { ascending: false });
    setGoals((data ?? []) as Goal[]);
  };

  useEffect(() => {
    void reload();
  }, []);

  // Realtime: react to inserts/updates/deletes on life_goals
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`strategy-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "life_goals", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Goal;
            setGoals((curr) => {
              const list = curr ?? [];
              if (list.some((g) => g.id === row.id)) return list;
              return [row, ...list];
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Goal;
            setGoals((curr) => (curr ?? []).map((g) => (g.id === row.id ? { ...g, ...row } : g)));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as any)?.id;
            if (oldId) setGoals((curr) => (curr ?? []).filter((g) => g.id !== oldId));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function completeGoal(g: Goal) {
    if (g.status === "concluido") return;
    setBusy({ id: g.id, action: "complete" });
    const { error } = await supabase
      .from("life_goals")
      .update({ status: "concluido" })
      .eq("id", g.id);
    setBusy(null);
    if (error) {
      toast.error("Falha ao concluir", { description: "Tente novamente mais tarde." });
      return;
    }
    setGoals((curr) =>
      (curr ?? []).map((x) => (x.id === g.id ? { ...x, status: "concluido" } : x)),
    );
    toast.success("ESTRATÉGIA CONCLUÍDA: +50 XP", {
      description: `"${g.objective}" finalizada.`,
    });
  }

  async function deleteGoal(g: Goal) {
    if (!confirm(`Excluir a meta "${g.objective}"? Esta ação não pode ser desfeita.`)) return;
    setBusy({ id: g.id, action: "delete" });
    const { error } = await supabase.from("life_goals").delete().eq("id", g.id);
    setBusy(null);
    if (error) {
      toast.error("Falha ao excluir", { description: "Tente novamente mais tarde." });
      return;
    }
    setGoals((curr) => (curr ?? []).filter((x) => x.id !== g.id));
    toast.success("Meta removida");
  }

  if (goals === null) return <SkeletonGrid />;
  if (goals.length === 0)
    return (
      <EmptyState
        icon={<Target className="h-8 w-8" />}
        title="Nenhuma meta definida"
        description="Vamos cadastrar uma meta e ver nosso progresso acontecer!"
      />
    );

  const statusColor: Record<string, string> = {
    em_progresso: "var(--gradient-primary)",
    concluido: "var(--gradient-accent)",
    pausado: "oklch(0.5 0.03 270)",
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const done = g.status === "concluido";
          const isCompleting = busy?.id === g.id && busy.action === "complete";
          const isDeleting = busy?.id === g.id && busy.action === "delete";
          return (
            <Card
              key={g.id}
              className={`group relative overflow-hidden border-border bg-card/70 backdrop-blur transition-opacity ${
                done ? "opacity-70" : ""
              }`}
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{
                  background: statusColor[g.status ?? "em_progresso"] ?? statusColor.em_progresso,
                }}
              />
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle
                    className={`text-lg leading-snug ${done ? "line-through text-muted-foreground" : ""}`}
                  >
                    {g.objective}
                  </CardTitle>
                  <Target className="h-5 w-5 shrink-0 text-primary opacity-60 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {g.horizon && (
                    <Badge variant="outline" className="border-accent/40 text-accent">
                      {g.horizon}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {(g.status ?? "em_progresso").replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={done ? "secondary" : "default"}
                    onClick={() => completeGoal(g)}
                    disabled={done || isCompleting}
                    className={
                      done
                        ? "flex-1 gap-2 rounded-lg border-0 bg-gradient-to-r from-[#73C5EA] to-[#88CED6] text-white hover:opacity-95 disabled:opacity-100 dark:from-[#065f46] dark:to-[#0d9488] dark:text-black"
                        : "flex-1 gap-2"
                    }
                  >
                    {isCompleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {done ? "Concluído hoje" : "Concluir"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(g)}
                    aria-label={`Editar ${g.objective}`}
                    title="Editar estratégia"
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteGoal(g)}
                    disabled={isDeleting}
                    className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Excluir ${g.objective}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <EditGoalModal
        goal={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={(updated) =>
          setGoals((curr) => (curr ?? []).map((g) => (g.id === updated.id ? updated : g)))
        }
      />
    </>
  );
}

/* ============ TO-DO LIST ============ */
type Priority = "Alta" | "Média" | "Baixa";
type TodoItem = {
  id: string;
  title: string;
  priority: Priority | null;
  is_completed: boolean | null;
  created_at: string | null;
  completed_at: string | null;
};

const PRIORITY_META: Record<
  Priority,
  { emoji: string; label: string; color: string; bg: string; ring: string }
> = {
  Alta: {
    emoji: "🔥",
    label: "Alta",
    color: "oklch(0.62 0.22 25)",
    bg: "color-mix(in oklab, oklch(0.62 0.22 25) 12%, transparent)",
    ring: "color-mix(in oklab, oklch(0.62 0.22 25) 35%, transparent)",
  },
  Média: {
    emoji: "⚡",
    label: "Média",
    color: "oklch(0.78 0.17 85)",
    bg: "color-mix(in oklab, oklch(0.78 0.17 85) 12%, transparent)",
    ring: "color-mix(in oklab, oklch(0.78 0.17 85) 35%, transparent)",
  },
  Baixa: {
    emoji: "🟢",
    label: "Baixa",
    color: "oklch(0.65 0.16 150)",
    bg: "color-mix(in oklab, oklch(0.65 0.16 150) 12%, transparent)",
    ring: "color-mix(in oklab, oklch(0.65 0.16 150) 35%, transparent)",
  },
};

const PRIORITY_ORDER: Priority[] = ["Alta", "Média", "Baixa"];

function TodoTab() {
  const { user } = AuthCtx.useAuth();
  const [items, setItems] = useState<TodoItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Média");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("todo_list")
      .select("id,title,priority,is_completed,created_at,completed_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Falha ao carregar tarefas", { description: "Tente novamente mais tarde." });
      setItems([]);
      return;
    }
    setItems((data ?? []) as TodoItem[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Sessão expirada", { description: "Faça login para criar tarefas." });
      return;
    }
    const t = title.trim();
    if (!t) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("todo_list")
      .insert({ user_id: user.id, title: t, priority })
      .select("id,title,priority,is_completed,created_at,completed_at")
      .single();
    setCreating(false);
    if (error) {
      toast.error("Falha ao criar tarefa", { description: "Tente novamente mais tarde." });
      return;
    }
    setItems((curr) => [data as TodoItem, ...(curr ?? [])]);
    setTitle("");
    toast.success("Tarefa adicionada");
  }

  async function toggleTodo(item: TodoItem) {
    setBusy(item.id);
    const next = !item.is_completed;
    const { data, error } = await supabase
      .from("todo_list")
      .update({ is_completed: next })
      .eq("id", item.id)
      .select("id,title,priority,is_completed,created_at,completed_at")
      .single();
    setBusy(null);
    if (error) {
      toast.error("Falha ao atualizar", { description: "Tente novamente mais tarde." });
      return;
    }
    setItems((curr) => (curr ?? []).map((x) => (x.id === item.id ? (data as TodoItem) : x)));
  }

  async function deleteTodo(item: TodoItem) {
    if (!confirm(`Excluir "${item.title}"?`)) return;
    setBusy(item.id);
    const { error } = await supabase.from("todo_list").delete().eq("id", item.id);
    setBusy(null);
    if (error) {
      toast.error("Falha ao excluir", { description: "Tente novamente mais tarde." });
      return;
    }
    setItems((curr) => (curr ?? []).filter((x) => x.id !== item.id));
    toast.success("Tarefa removida");
  }

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const pending = (items ?? []).filter((i) => !i.is_completed);
  const recentlyCompleted = (items ?? []).filter(
    (i) => i.is_completed && i.completed_at && now - new Date(i.completed_at).getTime() <= DAY_MS,
  );
  const archived = (items ?? []).filter(
    (i) => i.is_completed && (!i.completed_at || now - new Date(i.completed_at).getTime() > DAY_MS),
  );

  const groupedPending = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: pending
      .filter((i) => (i.priority ?? "Média") === p)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
  })).filter((g) => g.items.length > 0);

  if (items === null) return <SkeletonGrid />;

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card
        className="border-border bg-card/70 backdrop-blur"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5 text-primary" /> Nova tarefa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTodo} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="O que precisa ser feito?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_META[p].emoji} {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={creating || !title.trim()} className="gap-2">
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending grouped */}
      {groupedPending.length === 0 && recentlyCompleted.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-8 w-8" />}
          title="Sem tarefas pendentes"
          description="Adicione uma tarefa acima para começar."
        />
      ) : (
        <div className="space-y-5">
          {groupedPending.map((group) => {
            const meta = PRIORITY_META[group.priority];
            return (
              <section key={group.priority} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: meta.bg,
                      color: meta.color,
                      border: `1px solid ${meta.ring}`,
                    }}
                  >
                    <span aria-hidden>{meta.emoji}</span> Prioridade {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{group.items.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.items.map((item) => (
                    <TodoCard
                      key={item.id}
                      item={item}
                      busy={busy === item.id}
                      onToggle={toggleTodo}
                      onDelete={deleteTodo}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {recentlyCompleted.length > 0 && (
            <section className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Concluídas (últimas 24h)
                </span>
                <span className="text-xs text-muted-foreground">{recentlyCompleted.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {recentlyCompleted.map((item) => (
                  <TodoCard
                    key={item.id}
                    item={item}
                    busy={busy === item.id}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Archive trigger */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setArchiveOpen(true)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Archive className="h-4 w-4" />
          Ver arquivo {archived.length > 0 ? `(${archived.length})` : ""}
        </Button>
      </div>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" /> Arquivo de tarefas
            </DialogTitle>
            <DialogDescription>Tarefas concluídas há mais de 24 horas.</DialogDescription>
          </DialogHeader>
          {archived.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa arquivada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {archived
                .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
                .map((item) => {
                  const meta = PRIORITY_META[(item.priority ?? "Média") as Priority];
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/60 p-2.5 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span aria-hidden style={{ color: meta.color }}>
                          {meta.emoji}
                        </span>
                        <span className="truncate line-through text-muted-foreground">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {item.completed_at
                            ? new Date(item.completed_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTodo(item)}
                          disabled={busy === item.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TodoCard({
  item,
  busy,
  onToggle,
  onDelete,
}: {
  item: TodoItem;
  busy: boolean;
  onToggle: (i: TodoItem) => void;
  onDelete: (i: TodoItem) => void;
}) {
  const p = (item.priority ?? "Média") as Priority;
  const meta = PRIORITY_META[p];
  const done = !!item.is_completed;
  return (
    <Card
      className={`group relative overflow-hidden border-border bg-card/70 backdrop-blur transition-all ${
        done ? "opacity-70" : ""
      }`}
      style={{
        boxShadow: "var(--shadow-card)",
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: meta.color, opacity: 0.7 }}
      />
      <CardContent className="flex items-start gap-3 p-4">
        <Checkbox
          checked={done}
          onCheckedChange={() => onToggle(item)}
          disabled={busy}
          className="mt-0.5"
          style={{ borderColor: meta.color }}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium leading-snug ${
              done ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {item.title}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.ring}` }}
            >
              <span aria-hidden>{meta.emoji}</span> {meta.label}
            </span>
            {done && item.completed_at && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.completed_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          onClick={() => onDelete(item)}
          disabled={busy}
          aria-label="Excluir tarefa"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============ REFLEXÃO ============ */
type CoachResponse = {
  message: string;
  tone: "ríspido" | "disciplinado";
  stats: {
    completionRate: number;
    missedTrainingDays: number;
    missedRecent: string[];
    totalCheckins: number;
    trainingDays: number;
    daysWindow: number;
    lazinessSignals: number;
    sentCounts: Record<string, number>;
  };
};

function ReflectionTab() {
  const { user } = AuthCtx.useAuth();
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<string>("neutro");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  const [coaching, setCoaching] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("journal")
      .select("id,content,sentiment,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setEntries((data ?? []) as JournalEntry[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!content.trim()) return;
    if (!user) {
      toast.error("Sessão expirada", { description: "Faça login para salvar reflexões." });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("journal")
      .insert({ content, sentiment, user_id: user.id });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: "Tente novamente mais tarde." });
      return;
    }
    setContent("");
    toast.success("Reflexão registrada");
    load();
  }

  async function callCoach() {
    setCoaching(true);
    setCoach(null);
    try {
      const { data, error } = await supabase.functions.invoke("coach-analyze");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCoach(data as CoachResponse);
    } catch (e: any) {
      toast.error("Coach indisponível", { description: "Tente novamente mais tarde." });
    } finally {
      setCoaching(false);
    }
  }

  const sentiments = [
    { value: "positivo", label: "Positivo", color: "oklch(0.78 0.18 155)" },
    { value: "neutro", label: "Neutro", color: "oklch(0.6 0.03 260)" },
    { value: "desafiador", label: "Desafiador", color: "oklch(0.7 0.2 30)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card
        className="border-border bg-card/70 backdrop-blur"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenText className="h-5 w-5 text-primary" />
            Como foi seu dia?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva livremente... pensamentos, vitórias, lições..."
            className="min-h-[200px] resize-none bg-input/40 text-base leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            {sentiments.map((s) => (
              <button
                key={s.value}
                onClick={() => setSentiment(s.value)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                  sentiment === s.value
                    ? "border-transparent text-primary-foreground"
                    : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
                style={sentiment === s.value ? { background: s.color } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={save} disabled={saving || !content.trim()} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar reflexão"}
            </Button>
            <Button
              onClick={callCoach}
              disabled={coaching}
              variant="outline"
              className="flex-1 gap-2 border-accent/40"
            >
              {coaching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Brain className="h-4 w-4" /> Falar com o Coach
                </>
              )}
            </Button>
          </div>

          {coach && (
            <Card
              className="mt-2 border-0 overflow-hidden"
              style={{
                background:
                  coach.tone === "ríspido"
                    ? "linear-gradient(135deg, oklch(0.25 0.08 25), oklch(0.18 0.04 25))"
                    : "linear-gradient(135deg, oklch(0.22 0.05 200), oklch(0.16 0.03 220))",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  {coach.tone === "ríspido" ? (
                    <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
                  ) : (
                    <Brain className="h-5 w-5 text-accent" />
                  )}
                  <span className="text-xs uppercase tracking-widest text-foreground/80">
                    Coach · modo {coach.tone}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {coach.message}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <Badge variant="secondary">
                    Consistência: {(coach.stats.completionRate * 100).toFixed(0)}%
                  </Badge>
                  <Badge variant="secondary">
                    Treinos perdidos: {coach.stats.missedTrainingDays}/{coach.stats.daysWindow}d
                  </Badge>
                  {coach.stats.lazinessSignals > 0 && (
                    <Badge variant="destructive">
                      Sinais de preguiça: {coach.stats.lazinessSignals}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Reflexões recentes
        </h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {entries === null ? (
            <SkeletonGrid rows={3} />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma reflexão ainda.</p>
          ) : (
            entries.map((e) => (
              <Card key={e.id} className="border-border bg-card/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : ""}
                    </span>
                    {e.sentiment && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {e.sentiment}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 line-clamp-4">
                    {e.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ MÉTRICAS ============ */
type WeekBar = { week: string; checkins: number };
type CategorySlice = { name: string; value: number };
type VolumeBar = { period: string; total: number };

function MetricsTab() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [weekly, setWeekly] = useState<WeekBar[]>([]);
  const [byCategory, setByCategory] = useState<CategorySlice[]>([]);
  const [trainingVolume, setTrainingVolume] = useState<VolumeBar[]>([]);

  useEffect(() => {
    (async () => {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 7 * 8);
      const sinceISO = sinceDate.toISOString().slice(0, 10);

      const [{ data: prof }, { data: habits }, { data: logs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,level,xp_total,last_access")
          .order("xp_total", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("habits").select("id,category"),
        supabase.from("habit_logs").select("habit_id,completed_at").gte("completed_at", sinceISO),
      ]);

      setProfile((prof as Profile | null) ?? null);

      const weeks: { key: string; label: string; start: Date }[] = [];
      const now = new Date();
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day - 1));
      monday.setHours(0, 0, 0, 0);
      for (let i = 7; i >= 0; i--) {
        const start = new Date(monday);
        start.setDate(monday.getDate() - i * 7);
        const key = start.toISOString().slice(0, 10);
        const label = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        weeks.push({ key, label, start });
      }
      const counts: Record<string, number> = Object.fromEntries(weeks.map((w) => [w.key, 0]));
      for (const l of logs ?? []) {
        const d = new Date((l as any).completed_at);
        d.setHours(0, 0, 0, 0);
        for (let i = weeks.length - 1; i >= 0; i--) {
          if (d >= weeks[i].start) {
            counts[weeks[i].key]++;
            break;
          }
        }
      }
      setWeekly(weeks.map((w) => ({ week: w.label, checkins: counts[w.key] })));

      const habitCat: Record<string, string> = {};
      for (const h of habits ?? []) {
        habitCat[(h as any).id] = ((h as any).category ?? "sem categoria").toLowerCase();
      }
      const catCounts: Record<string, number> = {};
      for (const l of logs ?? []) {
        const notes = ((l as any).notes ?? "") as string;
        let cat: string;
        if ((l as any).habit_id) {
          cat = habitCat[(l as any).habit_id] ?? "sem categoria";
        } else if (/^\s*treino\b/i.test(notes) || /\btreino\b/i.test(notes)) {
          // Logs avulsos registrados pelo NOC ("Registrar treino") não têm habit_id.
          cat = "treino";
        } else {
          cat = "sem categoria";
        }
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
      }
      setByCategory(Object.entries(catCounts).map(([name, value]) => ({ name, value })));

      // ----- Volumetria acumulada de treinos (todos os tempos) -----
      const trainingKeyword = /(trein|fit|workout|exerc|academia|gym|corr)/i;
      const trainingHabitIds = new Set(
        (habits ?? [])
          .filter((h: any) => trainingKeyword.test(h.category ?? ""))
          .map((h: any) => h.id as string),
      );
      const { data: allTrainingLogs } = await supabase
        .from("habit_logs")
        .select("habit_id,completed_at,notes")
        .order("completed_at", { ascending: true });

      const trainingLogs = (allTrainingLogs ?? []).filter((l: any) => {
        if (l.habit_id && trainingHabitIds.has(l.habit_id)) return true;
        // Fallback: NOC inserts may have null habit_id but notes describe the training
        if (!l.habit_id && typeof l.notes === "string" && l.notes.trim().length > 0) return true;
        return false;
      });

      const monthCounts: Record<string, number> = {};
      for (const l of trainingLogs) {
        const raw = (l as any).completed_at as string | null;
        if (!raw) continue;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthCounts[key] = (monthCounts[key] ?? 0) + 1;
      }
      const sortedKeys = Object.keys(monthCounts).sort();
      let acc = 0;
      const volume: VolumeBar[] = sortedKeys.map((k) => {
        acc += monthCounts[k];
        const [y, m] = k.split("-");
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        });
        return { period: label, total: acc };
      });
      setTrainingVolume(volume);
    })();
  }, []);

  const stats = useMemo(() => {
    const xp = profile?.xp_total ?? 0;
    const level = profile?.level ?? 1;
    const xpInLevel = xp % XP_PER_LEVEL;
    const pct = (xpInLevel / XP_PER_LEVEL) * 100;
    return { xp, level, xpInLevel, pct, toNext: XP_PER_LEVEL - xpInLevel };
  }, [profile]);

  if (profile === undefined) return <SkeletonGrid />;
  if (profile === null)
    return (
      <EmptyState
        icon={<Trophy className="h-8 w-8" />}
        title="Nenhum perfil encontrado"
        description="Crie um registro em 'profiles' para acompanhar sua evolução."
      />
    );

  const PIE_COLORS = [
    "oklch(0.7 0.2 270)",
    "oklch(0.75 0.18 200)",
    "oklch(0.78 0.18 155)",
    "oklch(0.75 0.2 30)",
    "oklch(0.72 0.18 320)",
    "oklch(0.7 0.15 100)",
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card
        className="md:col-span-2 overflow-hidden border-border bg-card/70 backdrop-blur"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                {profile.full_name ?? "Aprendiz"}
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span
                  className="text-6xl font-bold leading-none"
                  style={{
                    background: "var(--gradient-primary)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Nv. {stats.level}
                </span>
                <span className="text-lg text-muted-foreground">
                  {stats.xp.toLocaleString("pt-BR")} XP total
                </span>
              </div>
            </div>
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full"
              style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}
            >
              <Trophy className="h-12 w-12 text-accent-foreground" />
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso para Nv. {stats.level + 1}</span>
              <span className="font-medium">
                {stats.xpInLevel} / {XP_PER_LEVEL} XP
              </span>
            </div>
            <Progress value={stats.pct} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Faltam {stats.toNext} XP para o próximo nível.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="border-border bg-card/70 backdrop-blur"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-primary" />
            Consistência semanal (8 semanas)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {weekly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 260)" />
                <XAxis dataKey="week" stroke="oklch(0.65 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0.02 260)" fontSize={11} allowDecimals={false} />
                <RTooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.3 0.03 260)",
                    borderRadius: 8,
                    color: "oklch(0.95 0 0)",
                  }}
                  cursor={{ fill: "oklch(0.3 0.03 260 / 0.3)" }}
                />
                <Bar dataKey="checkins" fill="oklch(0.7 0.2 270)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card
        className="border-border bg-card/70 backdrop-blur"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4 text-primary" />
            Total de Treinos Realizados (Volumetria)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {trainingVolume.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum treino registrado ainda. Use o botão "Registrar Treino" no monitor NOC.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trainingVolume} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 260)" />
                <XAxis dataKey="period" stroke="oklch(0.65 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0.02 260)" fontSize={11} allowDecimals={false} />
                <RTooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.3 0.03 260)",
                    borderRadius: 8,
                    color: "oklch(0.95 0 0)",
                  }}
                  cursor={{ fill: "oklch(0.3 0.03 260 / 0.3)" }}
                  formatter={(v: any) => [`${v} treinos`, "Acumulado"]}
                />
                <Bar dataKey="total" fill="oklch(0.78 0.18 155)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card
        className="border-border bg-card/70 backdrop-blur"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-accent" />
            Distribuição por categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem check-ins ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="oklch(0.15 0.02 260)"
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.3 0.03 260)",
                    borderRadius: 8,
                    color: "oklch(0.95 0 0)",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: "oklch(0.75 0.02 260)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card
      className="border-border bg-card/70 backdrop-blur"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============ NEXUS (Chat-Terminal) ============ */
type ChatMsg = { role: "user" | "assistant"; content: string };

function NexusTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdxs, setSavedIdxs] = useState<Set<number>>(new Set());

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("nexus-chat", {
        body: { messages: next },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = (data as any)?.message ?? "";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error("Nexus offline", { description: "Tente novamente mais tarde." });
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function saveToWiki(idx: number, content: string) {
    setSavingIdx(idx);
    // Título: 1ª linha não-vazia, máx 80 chars
    const firstLine =
      content
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("```")) ?? "Solução técnica";
    const titulo = firstLine.slice(0, 80);

    // Tags = linguagens dos blocos ```lang
    const tags = Array.from(
      new Set(Array.from(content.matchAll(/```([a-zA-Z0-9_+-]+)/g)).map((m) => m[1].toLowerCase())),
    );

    const { data: userRes } = await supabase.auth.getUser();
    const user_id = userRes?.user?.id ?? null;

    const { error } = await supabase
      .from("kb_tecnica")
      .insert({ titulo, solucao: content, tags, user_id });

    if (error) {
      setSavingIdx(null);
      toast.error("Falha ao salvar na Wiki", { description: "Tente novamente mais tarde." });
      return;
    }

    if (user_id) {
      const { error: rpcErr } = await supabase.rpc("adicionar_xp", {
        xp_ganho: 25,
      });
      if (rpcErr) console.warn("XP RPC error:", rpcErr.message);
    }

    setSavedIdxs((s) => new Set(s).add(idx));
    setSavingIdx(null);
    toast.success("Solução salva na Wiki", { description: "+25 XP de Conhecimento" });
  }

  function renderContent(text: string) {
    // Divide em segmentos: texto e blocos ```lang ... ```
    const parts: { type: "text" | "code"; lang?: string; content: string }[] = [];
    const re = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
      parts.push({ type: "code", lang: m[1] || "txt", content: m[2].replace(/\n$/, "") });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
    if (parts.length === 0) parts.push({ type: "text", content: text });

    return parts.map((p, i) =>
      p.type === "code" ? (
        <pre
          key={i}
          className="my-2 overflow-x-auto rounded-md border border-primary/30 p-3 text-xs leading-relaxed"
          style={{ background: "var(--nexus-code-bg)" }}
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-primary/70">{p.lang}</div>
          <code style={{ color: "var(--nexus-code-fg)" }}>{p.content}</code>
        </pre>
      ) : (
        <span key={i} className="whitespace-pre-wrap">
          {p.content}
        </span>
      ),
    );
  }

  return (
    <Card
      className="border-primary/30 font-mono"
      style={{ boxShadow: "var(--shadow-glow)", background: "var(--nexus-surface)" }}
    >
      <CardHeader className="border-b border-primary/20">
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <Terminal className="h-4 w-4" />
          nexus@coach:~$
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[480px] overflow-y-auto p-4 text-sm">
          {messages.length === 0 ? (
            <div className="text-muted-foreground">
              <p>// Pronto. Mande dúvida técnica ou desabafo.</p>
              <p className="mt-1 opacity-60">
                // Respostas com bloco de código podem ser salvas na Wiki (+25 XP).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const hasCode = !isUser && /```[\s\S]+?```/.test(m.content);
                return (
                  <div key={i} className="space-y-1">
                    <div
                      className={`text-[10px] uppercase tracking-widest ${
                        isUser ? "text-accent" : "text-primary"
                      }`}
                    >
                      {isUser ? "USER" : "NEXUS"}:
                    </div>
                    <div className="text-foreground/90">{renderContent(m.content)}</div>
                    {hasCode && (
                      <div className="pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 border-primary/40 text-xs"
                          disabled={savingIdx === i || savedIdxs.has(i)}
                          onClick={() => saveToWiki(i, m.content)}
                        >
                          {savingIdx === i ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : savedIdxs.has(i) ? (
                            <>
                              <Check className="h-3 w-3" /> Salvo na Wiki
                            </>
                          ) : (
                            <>
                              <Save className="h-3 w-3" /> Salvar na Wiki (+25 XP)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-primary/70">
                  <Loader2 className="h-3 w-3 animate-spin" /> nexus pensando...
                </div>
              )}
            </div>
          )}
        </div>
        <div
          className="flex items-center gap-2 border-t border-primary/20 p-3"
          style={{ background: "var(--nexus-surface-strong)" }}
        >
          <span className="text-primary">$</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Dúvida técnica ou desabafo..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            disabled={sending}
          />
          <Button size="sm" onClick={send} disabled={sending || !input.trim()} className="gap-1">
            <Send className="h-3 w-3" /> Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============ Helpers ============ */

/* ============ MANAGEMENT BAR ============ */
type ModalKind = "habit" | "goal" | null;

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

function ManagementBar() {
  const [open, setOpen] = useState<ModalKind>(null);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-3 backdrop-blur">
      <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground">
        Gerenciamento
      </span>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpen("habit")}>
        <Plus className="h-3.5 w-3.5" /> Novo Hábito
      </Button>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpen("goal")}>
        <Plus className="h-3.5 w-3.5" /> Nova Estratégia
      </Button>
      <NewHabitModal open={open === "habit"} onClose={() => setOpen(null)} />
      <NewGoalModal open={open === "goal"} onClose={() => setOpen(null)} />
    </div>
  );
}

function NewHabitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // XP fixo (+30) gerenciado pelo backend
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<FrequencyType>("diario");
  const [duration, setDuration] = useState("4");
  const [target, setTarget] = useState("1");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    const user_id = await getCurrentUserId();
    const { error } = await supabase.from("habits").insert({
      title: title.trim(),
      category: category.trim() || null,
      frequency_type: frequency,
      duration: Number(duration) || 0,
      target_per_period: Number(target) || 1,
      user_id,
    });
    setSaving(false);
    if (error) {
      toast.error("Falha ao criar hábito", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Hábito criado");
    setTitle("");
    setCategory("");
    setFrequency("diario");
    setDuration("4");
    setTarget("1");
    onClose();
  }

  const durationLabel =
    frequency === "diario"
      ? "Duração (dias)"
      : frequency === "semanal"
        ? "Duração (semanas)"
        : "Duração (meses)";
  const targetLabel =
    frequency === "diario"
      ? "Check-ins / dia"
      : frequency === "semanal"
        ? "Dias / semana"
        : "Dias / mês";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Hábito</DialogTitle>
          <DialogDescription>Adicione um novo hábito ao seu dojo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="h-title">Título</Label>
            <Input
              id="h-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-cat">Categoria</Label>
            <Input
              id="h-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="treino, mental, estudo..."
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-freq">Tipo</Label>
            <select
              id="h-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as FrequencyType)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="diario">Diário</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            XP fixo por check-in: <span className="font-mono text-foreground">+30 XP</span>{" "}
            (gerenciado pelo sistema)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="h-dur">{durationLabel}</Label>
              <Input
                id="h-dur"
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="h-target">{targetLabel}</Label>
              <Input
                id="h-target"
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditHabitModal({
  habit,
  open,
  onClose,
  onSaved,
}: {
  habit: Habit | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Habit) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<FrequencyType>("diario");
  const [duration, setDuration] = useState("0");
  const [target, setTarget] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (habit) {
      setTitle(habit.title ?? "");
      setCategory(habit.category ?? "");
      setFrequency(normalizeFrequency(habit.frequency_type));
      setDuration(String(habit.duration ?? 0));
      setTarget(String(habit.target_per_period ?? 1));
    }
  }, [habit]);

  async function submit() {
    if (!habit || !title.trim()) return;
    setSaving(true);
    const updates = {
      title: title.trim(),
      category: category.trim() || null,
      frequency_type: frequency,
      duration: Number(duration) || 0,
      target_per_period: Number(target) || 1,
    };
    const { error } = await supabase.from("habits").update(updates).eq("id", habit.id);
    setSaving(false);
    if (error) {
      toast.error("Falha ao editar hábito", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Hábito atualizado");
    onSaved({ ...habit, ...updates });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Hábito</DialogTitle>
          <DialogDescription>Recategorize, reajuste a frequência ou as metas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="eh-title">Título</Label>
            <Input
              id="eh-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eh-cat">Categoria</Label>
            <Input
              id="eh-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eh-freq">Tipo</Label>
            <select
              id="eh-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as FrequencyType)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="diario">Diário</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            XP fixo por check-in: <span className="font-mono text-foreground">+30 XP</span>{" "}
            (gerenciado pelo sistema)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eh-dur">Duração</Label>
              <Input
                id="eh-dur"
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eh-target">Meta por período</Label>
              <Input
                id="eh-target"
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [objective, setObjective] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("medio");
  const [status, setStatus] = useState("em_progresso");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!objective.trim()) return;
    setSaving(true);
    const user_id = await getCurrentUserId();
    const { error } = await supabase.from("life_goals").insert({
      objective: objective.trim(),
      horizon,
      status,
      user_id,
    });
    setSaving(false);
    if (error) {
      toast.error("Falha ao criar estratégia", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Estratégia criada");
    setObjective("");
    setHorizon("medio");
    setStatus("em_progresso");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Estratégia</DialogTitle>
          <DialogDescription>Defina uma meta de vida.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="g-obj">Objetivo</Label>
            <Textarea
              id="g-obj"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-hor">Horizonte</Label>
            <select
              id="g-hor"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="curto">Curto Prazo</option>
              <option value="medio">Médio Prazo</option>
              <option value="longo">Longo Prazo</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-st">Status</Label>
            <select
              id="g-st"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="em_progresso">Em progresso</option>
              <option value="concluido">Concluído</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !objective.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkeletonGrid({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card/40" />
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed border-border bg-card/40">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EditGoalModal({
  goal,
  open,
  onClose,
  onSaved,
}: {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Goal) => void;
}) {
  const [objective, setObjective] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("medio");
  const [status, setStatus] = useState("em_progresso");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setObjective(goal.objective ?? "");
      setHorizon(normalizeHorizon(goal.horizon));
      setStatus(goal.status ?? "em_progresso");
    }
  }, [goal]);

  async function submit() {
    if (!goal || !objective.trim()) return;
    setSaving(true);
    const updates = {
      objective: objective.trim(),
      horizon,
      status,
    };
    const { error } = await supabase.from("life_goals").update(updates).eq("id", goal.id);
    setSaving(false);
    if (error) {
      toast.error("Falha ao editar estratégia", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Estratégia atualizada");
    onSaved({ ...goal, ...updates });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Estratégia</DialogTitle>
          <DialogDescription>Atualize objetivo, horizonte ou status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="eg-obj">Objetivo</Label>
            <Textarea
              id="eg-obj"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eg-hor">Horizonte</Label>
            <select
              id="eg-hor"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="curto">Curto Prazo</option>
              <option value="medio">Médio Prazo</option>
              <option value="longo">Longo Prazo</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eg-st">Status</Label>
            <select
              id="eg-st"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="em_progresso">Em progresso</option>
              <option value="concluido">Concluído</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !objective.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

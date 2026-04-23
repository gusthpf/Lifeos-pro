import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
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
      { title: "AI Life Coach — Dojo, Estratégia, Reflexão" },
      {
        name: "description",
        content:
          "Seu life coach pessoal: gerencie hábitos, metas de vida, reflexões e métricas de evolução em XP.",
      },
    ],
  }),
  component: LifeCoachApp,
});

type Habit = { id: string; title: string; category: string | null; xp_reward: number | null };
type Goal = {
  id: string;
  objective: string;
  horizon: string | null;
  status: string | null;
  created_at: string | null;
};
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

const XP_PER_LEVEL = 500;

function LifeCoachApp() {
  return (
    <div className="min-h-screen text-foreground">
      <Toaster theme="dark" position="top-center" richColors />
      <header className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Life Coach</h1>
            <p className="text-sm text-muted-foreground">
              Treine. Planeje. Reflita. Evolua.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <NocPanel />
        <Tabs defaultValue="dojo" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-card/60 backdrop-blur border border-border h-12">
            <TabsTrigger value="dojo" className="gap-2">
              <Swords className="h-4 w-4" /> Dojo
            </TabsTrigger>
            <TabsTrigger value="estrategia" className="gap-2">
              <Target className="h-4 w-4" /> Estratégia
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

/* ============ NOC DASHBOARD ============ */
function getBahiaDateISO(): string {
  // America/Bahia is UTC-3, no DST. Use Intl to be safe.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

function NocPanel() {
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [lastCheck, setLastCheck] = useState<string>("");
  const [logCount, setLogCount] = useState<number>(0);
  const today = getBahiaDateISO();

  async function probe() {
    setStatus("loading");
    const { data, error } = await supabase
      .from("habit_logs")
      .select("id", { count: "exact" })
      .eq("completed_at", today);
    const now = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour12: false });
    setLastCheck(now);
    if (error) {
      setStatus("offline");
      setLogCount(0);
      return;
    }
    const count = data?.length ?? 0;
    setLogCount(count);
    setStatus(count > 0 ? "online" : "offline");
  }

  useEffect(() => {
    probe();
    const id = setInterval(probe, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const isOnline = status === "online";
  const isOffline = status === "offline";

  // Terminal palette via inline tokens (kept local to NOC aesthetic)
  const greenBorder = "oklch(0.78 0.18 155)";
  const redBorder = "oklch(0.62 0.24 25)";

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-md border-2 font-mono text-sm noc-scanline ${
        isOffline ? "noc-blink" : ""
      }`}
      style={{
        borderColor: isOnline ? greenBorder : isOffline ? redBorder : "var(--border)",
        background: isOnline
          ? "linear-gradient(180deg, oklch(0.22 0.06 155 / 0.65), oklch(0.14 0.04 155 / 0.85))"
          : isOffline
            ? "linear-gradient(180deg, oklch(0.24 0.10 25 / 0.7), oklch(0.14 0.06 25 / 0.9))"
            : "var(--card)",
        boxShadow: isOnline
          ? `0 0 24px -4px ${greenBorder}`
          : isOffline
            ? `0 0 28px -4px ${redBorder}`
            : "none",
      }}
      role="status"
      aria-live="polite"
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] uppercase tracking-widest"
        style={{
          borderColor: isOnline ? greenBorder : redBorder,
          color: isOnline ? greenBorder : redBorder,
        }}
      >
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: isOnline ? greenBorder : redBorder,
              boxShadow: `0 0 8px ${isOnline ? greenBorder : redBorder}`,
            }}
          />
          NOC // DISCIPLINE MONITOR
        </span>
        <span className="opacity-80">TZ: America/Bahia · {today}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {status === "loading" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>$ probing habit_logs...</span>
          </div>
        ) : isOnline ? (
          <div className="space-y-1" style={{ color: greenBorder }}>
            <div className="text-xs opacity-80">$ check --date {today}</div>
            <div className="text-lg font-bold tracking-wider sm:text-xl">
              ▲ SYSTEM ONLINE: DISCIPLINA ATIVA
            </div>
            <div className="text-xs opacity-80">
              {logCount} log{logCount === 1 ? "" : "s"} registrado{logCount === 1 ? "" : "s"} hoje · last_probe={lastCheck}
            </div>
          </div>
        ) : (
          <div className="space-y-1" style={{ color: redBorder }}>
            <div className="text-xs opacity-80">$ check --date {today}</div>
            <div className="text-lg font-bold tracking-wider sm:text-xl">
              ✖ CRITICAL: UPTIME COMPROMETIDO. TREINO PENDENTE
            </div>
            <div className="text-xs opacity-80">
              0 logs registrados · last_probe={lastCheck} · auto_retry=60s
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ DOJO ============ */
function DojoTab() {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      const [{ data: h }, { data: logs }] = await Promise.all([
        supabase.from("habits").select("id,title,category,xp_reward"),
        supabase.from("habit_logs").select("habit_id").eq("completed_at", today),
      ]);
      setHabits((h ?? []) as Habit[]);
      setCompletedToday(new Set((logs ?? []).map((l: any) => l.habit_id).filter(Boolean)));
    })();
  }, [today]);

  async function checkIn(habit: Habit) {
    if (completedToday.has(habit.id)) return;
    setPending(habit.id);
    const { error } = await supabase
      .from("habit_logs")
      .insert({ habit_id: habit.id, completed_at: today });
    setPending(null);
    if (error) {
      toast.error("Falha no check-in", { description: error.message });
      return;
    }
    setCompletedToday((s) => new Set(s).add(habit.id));
    toast.success(`+${habit.xp_reward ?? 10} XP`, {
      description: `"${habit.title}" concluído!`,
    });
  }

  if (habits === null) return <SkeletonGrid />;

  if (habits.length === 0)
    return (
      <EmptyState
        icon={<Swords className="h-8 w-8" />}
        title="Nenhum hábito no dojo"
        description="Adicione hábitos na tabela 'habits' do Supabase para começar a treinar."
      />
    );

  return (
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
              <Button
                onClick={() => checkIn(habit)}
                disabled={done || isPending}
                className="w-full"
                style={
                  done
                    ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)" }
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ============ ESTRATÉGIA ============ */
function StrategyTab() {
  const [goals, setGoals] = useState<Goal[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("life_goals")
        .select("id,objective,horizon,status,created_at")
        .order("created_at", { ascending: false });
      setGoals((data ?? []) as Goal[]);
    })();
  }, []);

  if (goals === null) return <SkeletonGrid />;
  if (goals.length === 0)
    return (
      <EmptyState
        icon={<Target className="h-8 w-8" />}
        title="Nenhuma meta definida"
        description="Insira metas em 'life_goals' para visualizar sua estratégia."
      />
    );

  const statusColor: Record<string, string> = {
    em_progresso: "var(--gradient-primary)",
    concluido: "var(--gradient-accent)",
    pausado: "oklch(0.5 0.03 270)",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {goals.map((g) => (
        <Card
          key={g.id}
          className="group relative overflow-hidden border-border bg-card/70 backdrop-blur"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: statusColor[g.status ?? "em_progresso"] ?? statusColor.em_progresso }}
          />
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-lg leading-snug">{g.objective}</CardTitle>
              <Target className="h-5 w-5 shrink-0 text-primary opacity-60 transition-opacity group-hover:opacity-100" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {g.horizon && (
              <Badge variant="outline" className="border-accent/40 text-accent">
                {g.horizon}
              </Badge>
            )}
            <Badge variant="secondary">{(g.status ?? "em_progresso").replace("_", " ")}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
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
    setSaving(true);
    const { error } = await supabase.from("journal").insert({ content, sentiment });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
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
      toast.error("Coach indisponível", { description: e?.message ?? "Tente novamente." });
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
      <Card className="border-border bg-card/70 backdrop-blur" style={{ boxShadow: "var(--shadow-card)" }}>
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

function MetricsTab() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [weekly, setWeekly] = useState<WeekBar[]>([]);
  const [byCategory, setByCategory] = useState<CategorySlice[]>([]);

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
        const cat = habitCat[(l as any).habit_id] ?? "sem categoria";
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
      }
      setByCategory(Object.entries(catCounts).map(([name, value]) => ({ name, value })));
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

      <Card className="border-border bg-card/70 backdrop-blur" style={{ boxShadow: "var(--shadow-card)" }}>
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

      <Card className="border-border bg-card/70 backdrop-blur" style={{ boxShadow: "var(--shadow-card)" }}>
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border bg-card/70 backdrop-blur" style={{ boxShadow: "var(--shadow-card)" }}>
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
      toast.error("Nexus offline", { description: e?.message ?? "Tente novamente." });
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
      new Set(
        Array.from(content.matchAll(/```([a-zA-Z0-9_+-]+)/g)).map((m) =>
          m[1].toLowerCase(),
        ),
      ),
    );

    const { data: userRes } = await supabase.auth.getUser();
    const user_id = userRes?.user?.id ?? null;

    const { error } = await supabase
      .from("kb_tecnica")
      .insert({ titulo, solucao: content, tags, user_id });

    if (error) {
      setSavingIdx(null);
      toast.error("Falha ao salvar na Wiki", { description: error.message });
      return;
    }

    if (user_id) {
      const { error: rpcErr } = await supabase.rpc("adicionar_xp", {
        user_id_input: user_id,
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
          className="my-2 overflow-x-auto rounded-md border border-primary/30 bg-black/60 p-3 text-xs leading-relaxed"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-primary/70">
            {p.lang}
          </div>
          <code className="text-primary/90">{p.content}</code>
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
      className="border-primary/30 bg-black/70 font-mono"
      style={{ boxShadow: "var(--shadow-glow)" }}
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
        <div className="flex items-center gap-2 border-t border-primary/20 bg-black/80 p-3">
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
          <Button
            size="sm"
            onClick={send}
            disabled={sending || !input.trim()}
            className="gap-1"
          >
            <Send className="h-3 w-3" /> Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============ Helpers ============ */
function SkeletonGrid({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border border-border bg-card/40"
        />
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

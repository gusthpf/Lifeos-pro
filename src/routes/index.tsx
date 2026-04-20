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
        <Tabs defaultValue="dojo" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card/60 backdrop-blur border border-border h-12">
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
        </Tabs>
      </main>
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
function ReflectionTab() {
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<string>("neutro");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);

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
          <Button onClick={save} disabled={saving || !content.trim()} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar reflexão"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Reflexões recentes
        </h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
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
function MetricsTab() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,level,xp_total,last_access")
        .order("xp_total", { ascending: false })
        .limit(1)
        .maybeSingle();
      setProfile((data as Profile | null) ?? null);
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

      <StatCard
        icon={<Zap className="h-5 w-5" />}
        label="XP Total"
        value={stats.xp.toLocaleString("pt-BR")}
      />
      <StatCard
        icon={<Flame className="h-5 w-5" />}
        label="Último acesso"
        value={
          profile.last_access
            ? new Date(profile.last_access).toLocaleDateString("pt-BR")
            : "—"
        }
      />
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

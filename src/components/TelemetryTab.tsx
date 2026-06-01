import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Gauge, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WeeklyRow = { day: string; xp_total: number };

function useIsDark() {
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const DARK_COLOR = "#10b981"; // emerald neon
const LIGHT_COLOR = "#545B62";

function formatDayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

export function TelemetryTab() {
  const { user } = useAuth();
  const isDark = useIsDark();
  const color = isDark ? DARK_COLOR : LIGHT_COLOR;

  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [habitConformity, setHabitConformity] = useState(0);
  const [tasks7d, setTasks7d] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const sevenDaysAgoISO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const sevenDaysAgoTs = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

      const [weeklyRes, habitsRes, logsRes, tasksRes] = await Promise.all([
        supabase
          .from("vw_telemetry_xp_weekly" as never)
          .select("day,xp_total")
          .order("day", { ascending: true }),
        supabase.from("habits").select("id", { count: "exact", head: true }),
        supabase
          .from("habit_logs")
          .select("id,completed_at")
          .gte("completed_at", sevenDaysAgoISO),
        supabase
          .from("todo_list")
          .select("id", { count: "exact", head: true })
          .eq("is_completed", true)
          .gte("completed_at", sevenDaysAgoTs),
      ]);

      if (cancelled) return;

      const weeklyData = ((weeklyRes.data as WeeklyRow[] | null) ?? []).map((r) => ({
        day: r.day,
        xp_total: Number(r.xp_total) || 0,
      }));
      setWeekly(weeklyData);

      const totalHabits = habitsRes.count ?? 0;
      const logs = logsRes.data ?? [];
      // Conformidade = % de dias com pelo menos 1 log nos últimos 7 dias,
      // ponderado pela quantidade de hábitos ativos (limitado a 100%).
      const uniqueLogDays = new Set(logs.map((l: any) => l.completed_at)).size;
      const denom = Math.max(1, 7);
      const base = (uniqueLogDays / denom) * 100;
      const pct = totalHabits === 0 ? 0 : Math.min(100, Math.round(base));
      setHabitConformity(pct);

      setTasks7d(tasksRes.count ?? 0);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const totalXp7d = useMemo(
    () => weekly.reduce((s, r) => s + r.xp_total, 0),
    [weekly],
  );

  const radialData = useMemo(
    () => [{ name: "SLA", value: habitConformity, fill: color }],
    [habitConformity, color],
  );

  const chartData = useMemo(
    () => weekly.map((r) => ({ label: formatDayLabel(r.day), xp: r.xp_total })),
    [weekly],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5" style={{ color }} />
        <h2 className="text-xl font-semibold tracking-tight">
          Telemetria & Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI 1 — SLA disponibilidade */}
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Gauge className="h-4 w-4" /> SLA de Disponibilidade
            </CardTitle>
            <span className="text-xs text-muted-foreground">7d</span>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            {loading ? (
              <Skeleton className="h-[140px] w-[140px] rounded-full" />
            ) : (
              <div className="h-[140px] w-[140px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="75%"
                    outerRadius="100%"
                    data={radialData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis
                      type="number"
                      domain={[0, 100]}
                      angleAxisId={0}
                      tick={false}
                    />
                    <RadialBar
                      background={{ fill: isDark ? "#1f2937" : "#e5e7eb" }}
                      dataKey="value"
                      cornerRadius={20}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ color }}
                >
                  <span className="text-3xl font-bold tabular-nums">
                    {habitConformity}%
                  </span>
                  <span className="text-[10px] uppercase tracking-widest opacity-70">
                    Conformidade
                  </span>
                </div>
              </div>
            )}
            <div className="flex-1 space-y-1 text-sm">
              <p className="text-muted-foreground">
                Conformidade de hábitos nos últimos 7 dias.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 — Volumetria */}
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4" /> Volumetria Operacional
            </CardTitle>
            <span className="text-xs text-muted-foreground">7d</span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-14 w-32" />
            ) : (
              <div className="flex items-baseline gap-3">
                <span
                  className="text-5xl font-bold tabular-nums"
                  style={{ color }}
                >
                  {tasks7d}
                </span>
                <span className="text-sm text-muted-foreground">
                  tarefas eliminadas
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Total de to-dos concluídos nos últimos 7 dias.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linha de transmissão XP */}
      <Card className="bg-card/60 backdrop-blur border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Linha de Transmissão · XP Weekly Throughput
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Evolução de XP gerado nos últimos 7 dias.
            </p>
          </div>
          {!loading && (
            <span
              className="text-xs uppercase tracking-widest tabular-nums"
              style={{ color }}
            >
              Σ {totalXp7d} XP
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={color}
                        stopOpacity={isDark ? 0.55 : 0.28}
                      />
                      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1f2937" : "#e5e7eb"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke={color}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? "#1f2937" : "#e5e7eb" }}
                  />
                  <YAxis
                    stroke={color}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ stroke: color, strokeOpacity: 0.3 }}
                    contentStyle={{
                      background: isDark ? "#020617" : "#ffffff",
                      border: `1px solid ${color}`,
                      borderRadius: 8,
                      boxShadow: isDark
                        ? `0 0 12px ${color}66`
                        : "0 4px 12px rgba(0,0,0,0.08)",
                      color: isDark ? "#e2e8f0" : "#111827",
                      fontSize: 12,
                    }}
                    labelStyle={{ color, fontWeight: 600 }}
                    formatter={(v) => [`${v ?? 0} XP`, "Throughput"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#xpFill)"
                    activeDot={{ r: 5, fill: color, stroke: color }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TelemetryTab;

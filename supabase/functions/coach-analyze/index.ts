// Coach AI — analyzes recent journal entries + habit_logs over the last 45 days
// Persona: rispid & direct if user shows laziness/lack of focus on training,
// brief & disciplined if doing well. Uses missed days as factual ammunition.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Authenticate the caller — required to access private journal/habit data.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Window: last 45 days
    const since = new Date();
    since.setDate(since.getDate() - 45);
    const sinceISO = since.toISOString();
    const sinceDate = sinceISO.slice(0, 10);

    const [{ data: journal }, { data: habits }, { data: logs }] = await Promise.all([
      sb
        .from("journal")
        .select("content,sentiment,created_at")
        .eq("user_id", userId)
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false })
        .limit(30),
      sb.from("habits").select("id,title,category,xp_reward").eq("user_id", userId),
      sb
        .from("habit_logs")
        .select("habit_id,completed_at")
        .eq("user_id", userId)
        .gte("completed_at", sinceDate),
    ]);

    // Build factual habit analysis
    const habitsArr = habits ?? [];
    const logsArr = logs ?? [];
    const trainingHabits = habitsArr.filter(
      (h: any) => (h.category ?? "").toLowerCase() === "treino",
    );
    const trainingIds = new Set(trainingHabits.map((h: any) => h.id));

    // Days expected
    const daysWindow = 45;
    const today = new Date();
    const allDays: string[] = [];
    for (let i = 0; i < daysWindow; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      allDays.push(d.toISOString().slice(0, 10));
    }

    // Days where ANY training was completed
    const trainingDays = new Set(
      logsArr
        .filter((l: any) => trainingIds.has(l.habit_id))
        .map((l: any) => l.completed_at),
    );
    const missedTrainingDays = allDays.filter((d) => !trainingDays.has(d));
    const missedRecent = missedTrainingDays.slice(0, 7); // most recent failures

    const totalCheckins = logsArr.length;
    const completionRate =
      trainingHabits.length > 0
        ? trainingDays.size / daysWindow
        : totalCheckins / (daysWindow * Math.max(habitsArr.length, 1));

    // Sentiment counts
    const sentCounts: Record<string, number> = {};
    for (const j of journal ?? []) {
      const s = (j as any).sentiment ?? "neutro";
      sentCounts[s] = (sentCounts[s] ?? 0) + 1;
    }

    // Heuristic for tone
    const lazinessSignals = (journal ?? []).filter((j: any) =>
      /pregui[cç]a|cansad|sem foco|desanim|n[ãa]o consegui|amanh[ãa]|depois eu|sem vontade/i.test(
        j.content ?? "",
      ),
    ).length;

    const isSlacking =
      completionRate < 0.6 || lazinessSignals >= 2 || missedTrainingDays.length > 18;

    const persona = isSlacking
      ? `Você é o COACH. Tom: RÍSPIDO, DIRETO, SEM PASSAR A MÃO NA CABEÇA. \
Sem xingamentos, mas sem dourar a pílula. Esfregue na cara os dias que ele falhou no treino. \
Cite datas específicas dos dias perdidos. Confronte qualquer sinal de preguiça encontrado nos textos. \
Máximo 6 frases. Termine com UMA ordem clara para amanhã.`
      : `Você é o COACH. Tom: BREVE, FOCADO em manter disciplina. Sem elogios excessivos. \
Reconheça a consistência em uma frase, depois aponte UMA coisa para apertar. \
Máximo 4 frases.`;

    const factPack = `
DADOS DOS ÚLTIMOS 45 DIAS:
- Hábitos de treino cadastrados: ${trainingHabits.length} (${trainingHabits.map((h: any) => h.title).join(", ") || "nenhum"})
- Dias com treino concluído: ${trainingDays.size}/${daysWindow}
- Taxa de consistência: ${(completionRate * 100).toFixed(0)}%
- Total de check-ins (todos hábitos): ${totalCheckins}
- Dias recentes SEM treino: ${missedRecent.join(", ") || "nenhum"}
- Total de dias perdidos no treino: ${missedTrainingDays.length}
- Sinais de preguiça/desânimo encontrados nos textos: ${lazinessSignals}
- Distribuição de sentimentos: ${JSON.stringify(sentCounts)}

ÚLTIMAS REFLEXÕES (mais recente primeiro):
${(journal ?? [])
  .slice(0, 10)
  .map(
    (j: any) =>
      `[${(j.created_at ?? "").slice(0, 10)} · ${j.sentiment ?? "neutro"}] ${(j.content ?? "").slice(0, 400)}`,
  )
  .join("\n---\n") || "(sem reflexões registradas)"}
`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: persona },
          { role: "user", content: factPack },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429)
        return new Response(JSON.stringify({ error: "Limite de requisições. Tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiRes.status === 402)
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const message: string = aiJson.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({
        message,
        tone: isSlacking ? "ríspido" : "disciplinado",
        stats: {
          completionRate,
          missedTrainingDays: missedTrainingDays.length,
          missedRecent,
          totalCheckins,
          trainingDays: trainingDays.size,
          daysWindow,
          lazinessSignals,
          sentCounts,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("coach-analyze error", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

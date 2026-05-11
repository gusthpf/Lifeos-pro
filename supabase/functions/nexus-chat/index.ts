// Nexus — coach-mentor técnico-pessoal com contexto do usuário e streaming SSE.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o NEXUS — coach-mentor técnico-pessoal estilo terminal.

PERSONA:
- Equilibra técnica e leitura humana. Lê o estado do usuário (cansaço, foco, consistência) e calibra a resposta.
- Tom seco, direto, sem terapia barata, sem disclaimers, sem enrolação.
- Quando notar padrão (ex.: 5 dias sem treino, sentimento "desafiador" recorrente, tarefas Alta empilhando), CITE o padrão antes de responder.

REGRAS:
- Para dúvidas TÉCNICAS (código, devops, arquitetura, debug): direto ao ponto, blocos de código markdown (\`\`\`lang ... \`\`\`) sempre que houver solução acionável.
- Para desabafos/dúvidas pessoais: máximo 5 frases. Reconheça o estado em UMA frase, depois UMA ação concreta para as próximas 24h.
- Use o CONTEXTO DO USUÁRIO quando relevante para personalizar a resposta. Não repita os dados crus de volta — extraia o sinal.
- Nunca invente dados. Se não tem contexto suficiente, pergunte UMA coisa.`;

async function buildUserContext(sb: any): Promise<string> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceISO = since.toISOString();
  const sinceDate = sinceISO.slice(0, 10);

  const [
    { data: profile },
    { data: habits },
    { data: logs },
    { data: journal },
    { data: todos },
    { data: strategies },
    { data: appts },
  ] = await Promise.all([
    sb.from("profiles").select("full_name,level,xp_total").maybeSingle(),
    sb.from("habits").select("title,category,frequency_type"),
    sb.from("habit_logs").select("habit_id,completed_at").gte("completed_at", sinceDate),
    sb.from("journal").select("content,sentiment,created_at").gte("created_at", sinceISO).order("created_at", { ascending: false }).limit(8),
    sb.from("todo_list").select("title,priority,is_completed,scheduled_date").eq("is_completed", false).limit(20),
    sb.from("strategies").select("title,is_completed,scheduled_date").eq("is_completed", false).limit(10),
    sb.from("appointments").select("title,start_time,completed_at").gte("start_time", sinceISO).order("start_time").limit(10),
  ]);

  const habitsArr = habits ?? [];
  const logsArr = logs ?? [];
  const days = new Set(logsArr.map((l: any) => l.completed_at));
  const consistency = habitsArr.length ? `${days.size}/14 dias com algum hábito` : "sem hábitos cadastrados";

  const sentCounts: Record<string, number> = {};
  for (const j of journal ?? []) {
    const s = (j as any).sentiment ?? "neutro";
    sentCounts[s] = (sentCounts[s] ?? 0) + 1;
  }

  const overdueTodos = (todos ?? []).filter(
    (t: any) => t.scheduled_date && t.scheduled_date < sinceDate.replace(/-\d\d$/, "-31"),
  );

  return `
CONTEXTO DO USUÁRIO (últimos 14 dias):
- Perfil: ${profile?.full_name ?? "Analista"} · nível ${profile?.level ?? 1} · ${profile?.xp_total ?? 0} XP
- Hábitos cadastrados: ${habitsArr.length} (${habitsArr.slice(0, 5).map((h: any) => h.title).join(", ") || "nenhum"})
- Consistência: ${consistency}
- Sentimentos no journal: ${JSON.stringify(sentCounts) || "{}"}
- Reflexões recentes (até 3): ${(journal ?? []).slice(0, 3).map((j: any) => `[${(j.sentiment ?? "neutro")}] ${(j.content ?? "").slice(0, 160)}`).join(" | ") || "nenhuma"}
- Tarefas pendentes: ${(todos ?? []).length} (Alta: ${(todos ?? []).filter((t: any) => t.priority === "Alta").length}${overdueTodos.length ? `, atrasadas: ${overdueTodos.length}` : ""})
- Estratégias pendentes: ${(strategies ?? []).length}
- Compromissos próximos: ${(appts ?? []).filter((a: any) => !a.completed_at).slice(0, 3).map((a: any) => `${a.title} (${(a.start_time ?? "").slice(0, 10)})`).join(", ") || "nenhum"}
`.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { messages, useContext } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX_MESSAGES = 50;
    const MAX_CONTENT_LEN = 4000;
    const safeMessages = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content ?? "").slice(0, MAX_CONTENT_LEN),
      }));

    let contextBlock = "";
    if (useContext) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        try {
          const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: u } = await sb.auth.getUser();
          if (u?.user) contextBlock = await buildUserContext(sb);
        } catch (e) {
          console.warn("context build failed", e);
        }
      }
    }

    const sysContent = contextBlock
      ? `${SYSTEM_PROMPT}\n\n${contextBlock}`
      : SYSTEM_PROMPT;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: sysContent }, ...safeMessages],
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

    return new Response(aiRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nexus-chat error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

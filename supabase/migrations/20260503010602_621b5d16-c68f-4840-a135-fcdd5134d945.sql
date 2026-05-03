
-- Recompute daily_sla_monitor to include ALL XP sources for the current day (America/Bahia)
-- Sources: workouts.xp_earned, habit_logs (30 each), todo_list completed today by priority, strategies completed today (50 each)
DROP VIEW IF EXISTS public.daily_sla_monitor;

CREATE VIEW public.daily_sla_monitor
WITH (security_invoker = on) AS
WITH bounds AS (
  SELECT
    (date_trunc('day', timezone('America/Bahia', now())) AT TIME ZONE 'America/Bahia') AS start_ts,
    ((date_trunc('day', timezone('America/Bahia', now())) + interval '1 day') AT TIME ZONE 'America/Bahia') AS end_ts,
    (date_trunc('day', timezone('America/Bahia', now())))::date AS ref_date
),
workout_xp AS (
  SELECT w.user_id, COALESCE(SUM(w.xp_earned), 0)::bigint AS xp
  FROM public.workouts w, bounds b
  WHERE w.created_at >= b.start_ts AND w.created_at < b.end_ts
  GROUP BY w.user_id
),
habit_xp AS (
  SELECT hl.user_id, (COUNT(*) * 30)::bigint AS xp
  FROM public.habit_logs hl, bounds b
  WHERE hl.completed_at = b.ref_date
  GROUP BY hl.user_id
),
todo_xp AS (
  SELECT t.user_id,
         COALESCE(SUM(CASE t.priority::text
            WHEN 'Alta' THEN 50
            WHEN 'Média' THEN 30
            WHEN 'Baixa' THEN 15
            ELSE 0 END), 0)::bigint AS xp
  FROM public.todo_list t, bounds b
  WHERE t.is_completed = true
    AND t.completed_at IS NOT NULL
    AND t.completed_at >= b.start_ts AND t.completed_at < b.end_ts
  GROUP BY t.user_id
),
strategy_xp AS (
  SELECT s.user_id, (COUNT(*) * 50)::bigint AS xp
  FROM public.strategies s, bounds b
  WHERE s.is_completed = true
    AND s.updated_at >= b.start_ts AND s.updated_at < b.end_ts
  GROUP BY s.user_id
),
justifications AS (
  SELECT i.user_id, COALESCE(SUM(i.xp_waived), 0)::bigint AS waived
  FROM public.incident_logs i, bounds b
  WHERE i.created_at >= b.start_ts AND i.created_at < b.end_ts
  GROUP BY i.user_id
),
all_users AS (
  SELECT user_id FROM workout_xp
  UNION SELECT user_id FROM habit_xp
  UNION SELECT user_id FROM todo_xp
  UNION SELECT user_id FROM strategy_xp
  UNION SELECT user_id FROM justifications
)
SELECT
  u.user_id,
  (SELECT ref_date FROM bounds) AS reference_date,
  (COALESCE(w.xp,0) + COALESCE(h.xp,0) + COALESCE(t.xp,0) + COALESCE(s.xp,0))::bigint AS realized_xp,
  COALESCE(j.waived,0)::bigint AS waived_xp,
  CASE
    WHEN (200 - COALESCE(j.waived,0)) <= 0 THEN 100::numeric
    ELSE LEAST(round((COALESCE(w.xp,0)+COALESCE(h.xp,0)+COALESCE(t.xp,0)+COALESCE(s.xp,0))::numeric / (200 - COALESCE(j.waived,0))::numeric * 100, 2), 100::numeric)
  END AS uptime_percentage,
  CASE
    WHEN (COALESCE(w.xp,0)+COALESCE(h.xp,0)+COALESCE(t.xp,0)+COALESCE(s.xp,0))::numeric >= ((200 - COALESCE(j.waived,0))::numeric * 0.9) THEN 'OPERATIONAL'
    WHEN (COALESCE(w.xp,0)+COALESCE(h.xp,0)+COALESCE(t.xp,0)+COALESCE(s.xp,0))::numeric >= ((200 - COALESCE(j.waived,0))::numeric * 0.5) THEN 'DEGRADED'
    ELSE 'CRITICAL'
  END AS system_status
FROM all_users u
LEFT JOIN workout_xp  w ON w.user_id = u.user_id
LEFT JOIN habit_xp    h ON h.user_id = u.user_id
LEFT JOIN todo_xp     t ON t.user_id = u.user_id
LEFT JOIN strategy_xp s ON s.user_id = u.user_id
LEFT JOIN justifications j ON j.user_id = u.user_id;

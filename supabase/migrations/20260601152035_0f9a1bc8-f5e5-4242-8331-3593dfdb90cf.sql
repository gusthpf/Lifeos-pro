
DROP VIEW IF EXISTS public.vw_telemetry_xp_weekly;

CREATE VIEW public.vw_telemetry_xp_weekly AS
WITH days AS (
  SELECT generate_series(
    (CURRENT_DATE - INTERVAL '6 days')::date,
    CURRENT_DATE::date,
    INTERVAL '1 day'
  )::date AS day
),
todo_xp AS (
  SELECT user_id,
         (completed_at AT TIME ZONE 'UTC')::date AS day,
         SUM(CASE priority
               WHEN 'Alta'::priority_level  THEN 50
               WHEN 'Média'::priority_level THEN 30
               WHEN 'Baixa'::priority_level THEN 15
               ELSE 0 END) AS xp
  FROM public.todo_list
  WHERE is_completed = true
    AND completed_at IS NOT NULL
    AND completed_at >= (CURRENT_DATE - INTERVAL '6 days')
  GROUP BY user_id, (completed_at AT TIME ZONE 'UTC')::date
),
workout_xp AS (
  SELECT user_id,
         (created_at AT TIME ZONE 'UTC')::date AS day,
         SUM(COALESCE(xp_earned, 50)) AS xp
  FROM public.workouts
  WHERE created_at >= (CURRENT_DATE - INTERVAL '6 days')
  GROUP BY user_id, (created_at AT TIME ZONE 'UTC')::date
),
habit_xp AS (
  SELECT user_id, completed_at AS day, COUNT(*) * 30 AS xp
  FROM public.habit_logs
  WHERE completed_at >= (CURRENT_DATE - INTERVAL '6 days')
  GROUP BY user_id, completed_at
)
SELECT u.id AS user_id,
       d.day,
       COALESCE(t.xp, 0) + COALESCE(w.xp, 0) + COALESCE(h.xp, 0) AS xp_total
FROM public.profiles u
CROSS JOIN days d
LEFT JOIN todo_xp    t ON t.user_id = u.id AND t.day = d.day
LEFT JOIN workout_xp w ON w.user_id = u.id AND w.day = d.day
LEFT JOIN habit_xp   h ON h.user_id = u.id AND h.day = d.day;

ALTER VIEW public.vw_telemetry_xp_weekly SET (security_invoker = true);
GRANT SELECT ON public.vw_telemetry_xp_weekly TO authenticated;

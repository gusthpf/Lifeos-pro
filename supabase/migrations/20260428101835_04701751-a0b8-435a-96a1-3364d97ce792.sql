-- 1) RLS policies for workouts (table currently has none)
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own workouts" ON public.workouts;
CREATE POLICY "Users manage own workouts"
ON public.workouts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Trigger: +50 XP on workout insert (reuses existing process_lifeos_gamification function)
DROP TRIGGER IF EXISTS tr_xp_workouts ON public.workouts;
CREATE TRIGGER tr_xp_workouts
AFTER INSERT ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.process_lifeos_gamification();
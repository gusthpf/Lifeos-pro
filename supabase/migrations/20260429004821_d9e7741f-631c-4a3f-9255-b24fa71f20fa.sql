
-- 1) Add category column to workouts (default 'Treino') and enforce via trigger
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Treino';

-- Force category to 'Treino' on every insert/update (idempotent: replace existing trigger)
DROP TRIGGER IF EXISTS tr_enforce_workout_category ON public.workouts;
CREATE TRIGGER tr_enforce_workout_category
BEFORE INSERT OR UPDATE ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public.enforce_workout_category();

-- 2) XP trigger for workouts (50 XP on insert) — using existing process_lifeos_gamification
DROP TRIGGER IF EXISTS tr_xp_workouts ON public.workouts;
CREATE TRIGGER tr_xp_workouts
AFTER INSERT ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public.process_lifeos_gamification();

-- 3) XP trigger for habit_logs (30 XP on insert)
DROP TRIGGER IF EXISTS tr_xp_habit_logs ON public.habit_logs;
CREATE TRIGGER tr_xp_habit_logs
AFTER INSERT ON public.habit_logs
FOR EACH ROW EXECUTE FUNCTION public.process_lifeos_gamification();

-- 4) XP trigger for todo_list (priority-based on completion)
DROP TRIGGER IF EXISTS tr_xp_todo_list ON public.todo_list;
CREATE TRIGGER tr_xp_todo_list
AFTER UPDATE ON public.todo_list
FOR EACH ROW EXECUTE FUNCTION public.process_lifeos_gamification();

-- 5) XP for life_goals completion (+50 XP) — create dedicated function
CREATE OR REPLACE FUNCTION public.process_life_goal_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status <> 'concluido') THEN
    UPDATE public.profiles
       SET xp_total = COALESCE(xp_total, 0) + 50
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_xp_life_goals ON public.life_goals;
CREATE TRIGGER tr_xp_life_goals
AFTER UPDATE ON public.life_goals
FOR EACH ROW EXECUTE FUNCTION public.process_life_goal_xp();

-- 6) Realtime: ensure REPLICA IDENTITY FULL and add tables to publication
ALTER TABLE public.life_goals REPLICA IDENTITY FULL;
ALTER TABLE public.strategies REPLICA IDENTITY FULL;
ALTER TABLE public.workouts REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.life_goals;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.strategies;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 1) Fix adicionar_xp: drop the unsafe (uuid, integer) version and recreate
--    with only xp_ganho, using auth.uid() server-side.
DROP FUNCTION IF EXISTS public.adicionar_xp(uuid, integer);

CREATE OR REPLACE FUNCTION public.adicionar_xp(xp_ganho integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles
     SET xp_total = COALESCE(xp_total, 0) + xp_ganho,
         level    = floor((COALESCE(xp_total, 0) + xp_ganho) / 1000) + 1
   WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.adicionar_xp(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adicionar_xp(integer) TO authenticated;

-- 2) Tighten profiles INSERT policy
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.profiles;
CREATE POLICY "Authenticated users insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3) Add DELETE policy to strategies
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias estratégias" ON public.strategies;
CREATE POLICY "Usuários podem deletar suas próprias estratégias"
  ON public.strategies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) Set search_path on all SECURITY DEFINER / trigger functions
ALTER FUNCTION public.add_task_xp()                    SET search_path = public;
ALTER FUNCTION public.process_strategy_gamification()  SET search_path = public;
ALTER FUNCTION public.enforce_workout_category()       SET search_path = public;
ALTER FUNCTION public.add_strategy_xp()                SET search_path = public;
ALTER FUNCTION public.update_modified_column()         SET search_path = public;
ALTER FUNCTION public.set_completed_at()               SET search_path = public;
ALTER FUNCTION public.handle_todo_completion()         SET search_path = public;
ALTER FUNCTION public.handle_new_user()                SET search_path = public;
ALTER FUNCTION public.add_system_xp()                  SET search_path = public;
ALTER FUNCTION public.process_gamification_xp()        SET search_path = public;
ALTER FUNCTION public.add_xp_for_todo()                SET search_path = public;
ALTER FUNCTION public.process_lifeos_gamification()    SET search_path = public;

-- 5) Lock down read-only query helper - it's an internal admin tool
REVOKE ALL ON FUNCTION public.run_read_only_query(text) FROM PUBLIC, anon, authenticated;

-- 1. Realtime channel authorization
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can subscribe to own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE ('%' || auth.uid()::text || '%')
);

-- 2. Security invoker views
ALTER VIEW public.daily_sla_monitor SET (security_invoker = on);
ALTER VIEW public.daily_xp_summary SET (security_invoker = on);

-- 3. incident_logs explicit owner UPDATE/DELETE
DROP POLICY IF EXISTS "Users can update their own incident logs" ON public.incident_logs;
CREATE POLICY "Users can update their own incident logs"
ON public.incident_logs FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own incident logs" ON public.incident_logs;
CREATE POLICY "Users can delete their own incident logs"
ON public.incident_logs FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 4. Strategies: scope to authenticated only
DROP POLICY IF EXISTS "Usuários podem ver suas próprias estratégias" ON public.strategies;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias estratégias" ON public.strategies;
DROP POLICY IF EXISTS "Usuários podem editar suas próprias estratégias" ON public.strategies;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias estratégias" ON public.strategies;

CREATE POLICY "Usuários podem ver suas próprias estratégias"
ON public.strategies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir suas próprias estratégias"
ON public.strategies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem editar suas próprias estratégias"
ON public.strategies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar suas próprias estratégias"
ON public.strategies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions in public
REVOKE EXECUTE ON FUNCTION public.process_life_goal_xp() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_strategy_xp() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_read_only_query(text) FROM anon, authenticated, PUBLIC;

-- 6. Fix mutable search_path on functions missing it
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.run_read_only_query(text) SET search_path = public;

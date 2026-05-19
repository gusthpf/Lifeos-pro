
CREATE POLICY "Users insert own daily activities"
  ON public.daily_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own daily activities"
  ON public.daily_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own daily activities"
  ON public.daily_activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own kb_tecnica"
  ON public.kb_tecnica FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own kb_tecnica"
  ON public.kb_tecnica FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

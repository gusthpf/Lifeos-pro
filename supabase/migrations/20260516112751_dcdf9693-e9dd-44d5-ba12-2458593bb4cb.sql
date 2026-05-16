-- Add workout_schedule column
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS workout_schedule TEXT[] NOT NULL DEFAULT '{Dom,Seg,Ter,Qua,Qui,Sex,Sab}';

-- Make sure user_id is set & unique per user
ALTER TABLE public.user_preferences
  ALTER COLUMN user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_id_key
  ON public.user_preferences(user_id);

-- Enable RLS and add policies (currently no policies => no access)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own preferences" ON public.user_preferences;
CREATE POLICY "Users manage own preferences"
  ON public.user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

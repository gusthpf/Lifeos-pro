ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.appointments ALTER COLUMN user_id SET NOT NULL;

CREATE POLICY "Users manage own appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS appointments_user_start_idx ON public.appointments (user_id, start_time);
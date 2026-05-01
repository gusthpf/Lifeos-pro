-- Allow all authenticated users to read incident categories (reference data)
CREATE POLICY "Authenticated users can view incident categories"
ON public.incident_categories
FOR SELECT
TO authenticated
USING (true);

-- Also ensure RLS is enabled and add insert/select policies for incident_logs
ALTER TABLE public.incident_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own incident logs"
ON public.incident_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own incident logs"
ON public.incident_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
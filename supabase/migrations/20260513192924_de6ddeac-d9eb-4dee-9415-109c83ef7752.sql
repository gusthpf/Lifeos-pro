
DROP POLICY IF EXISTS "NOC_Access_Policy_v1.9" ON public.workouts;
DROP POLICY IF EXISTS "NOC_Insert_Policy_v1.9" ON public.workouts;

ALTER VIEW public.monthly_ha_summary SET (security_invoker = true);
ALTER VIEW public.vw_export_csv SET (security_invoker = true);

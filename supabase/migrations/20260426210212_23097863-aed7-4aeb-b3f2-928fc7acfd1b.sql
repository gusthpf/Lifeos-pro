CREATE OR REPLACE FUNCTION public.adicionar_xp(user_id_input uuid, xp_ganho integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles
  SET xp_total = COALESCE(xp_total, 0) + xp_ganho,
      level = floor((COALESCE(xp_total, 0) + xp_ganho) / 500) + 1
  WHERE id = user_id_input;
END;
$function$;

UPDATE public.profiles
SET level = floor(COALESCE(xp_total, 0) / 500) + 1;

UPDATE public.life_goals
SET horizon = CASE
  WHEN horizon IS NULL OR btrim(horizon) = '' THEN 'medio'
  WHEN lower(horizon) ~ '(curto|short)' THEN 'curto'
  WHEN lower(horizon) ~ '(longo|long)'  THEN 'longo'
  WHEN lower(horizon) ~ '(m[eé]dio|mid|medium)' THEN 'medio'
  ELSE 'medio'
END;
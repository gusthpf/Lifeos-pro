-- Atualiza progressão de nível para 1000 XP por nível e habilita Realtime na tabela profiles
CREATE OR REPLACE FUNCTION public.adicionar_xp(user_id_input uuid, xp_ganho integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET xp_total = COALESCE(xp_total, 0) + xp_ganho,
      level = floor((COALESCE(xp_total, 0) + xp_ganho) / 1000) + 1
  WHERE id = user_id_input;
END;
$function$;

-- Garante que mudanças em profiles sejam transmitidas via Realtime para a UI
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
END $$;
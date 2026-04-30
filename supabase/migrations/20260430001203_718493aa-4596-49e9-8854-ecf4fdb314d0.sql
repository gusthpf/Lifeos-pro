-- Add duration_minutes and xp_earned to workouts for NOC Audit Log telemetry
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_earned integer NOT NULL DEFAULT 50;

-- Backfill existing rows so KPIs show consistent values
UPDATE public.workouts SET xp_earned = 50 WHERE xp_earned IS NULL OR xp_earned = 0;

-- Ensure realtime publication includes workouts (safe if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

ALTER TABLE public.workouts REPLICA IDENTITY FULL;
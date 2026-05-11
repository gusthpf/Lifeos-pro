
CREATE TABLE public.nexus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova sessão',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nexus_sessions_user ON public.nexus_sessions(user_id, updated_at DESC);

ALTER TABLE public.nexus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nexus sessions"
  ON public.nexus_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.nexus_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.nexus_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nexus_messages_session ON public.nexus_messages(session_id, created_at);

ALTER TABLE public.nexus_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nexus messages"
  ON public.nexus_messages FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_nexus_sessions_updated
BEFORE UPDATE ON public.nexus_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

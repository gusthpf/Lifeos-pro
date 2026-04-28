-- 1) Remove o trigger problemático em profiles (tabela não tem coluna updated_at)
DROP TRIGGER IF EXISTS update_profile_modtime ON public.profiles;

-- 2) Remove triggers duplicados/quebrados em todo_list
DROP TRIGGER IF EXISTS tr_todo_completion ON public.todo_list;  -- duplicata de tr_set_completed_at
DROP TRIGGER IF EXISTS tr_xp_todo_final ON public.todo_list;    -- usa função inexistente process_lifeos_gamification

-- 3) Remove trigger em habit_logs que usa função inexistente
DROP TRIGGER IF EXISTS tr_xp_habit_logs ON public.habit_logs;

-- 4) Garante que o XP da to-do está ativo via add_task_xp (já existe, mas recriamos por idempotência)
DROP TRIGGER IF EXISTS tr_add_task_xp ON public.todo_list;
CREATE TRIGGER tr_add_task_xp
AFTER UPDATE ON public.todo_list
FOR EACH ROW
EXECUTE FUNCTION public.add_task_xp();

-- 5) Garante o trigger único de completed_at
DROP TRIGGER IF EXISTS tr_set_completed_at ON public.todo_list;
CREATE TRIGGER tr_set_completed_at
BEFORE UPDATE ON public.todo_list
FOR EACH ROW
EXECUTE FUNCTION public.set_completed_at();

-- 6) Recria trigger de XP para habit_logs usando função existente process_gamification_xp
CREATE TRIGGER tr_xp_habit_logs
AFTER INSERT ON public.habit_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_gamification_xp();
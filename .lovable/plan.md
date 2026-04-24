## Problema

Com RLS ativo nas tabelas `habit_logs` e `journal` (`auth.uid() = user_id`), os inserts atuais falham porque o código não envia o `user_id`. Hoje as chamadas em `src/routes/index.tsx` são:

- Linha 346 — check-in de hábito:
  `supabase.from("habit_logs").insert({ habit_id, completed_at })`
- Linha 528 — salvar journal:
  `supabase.from("journal").insert({ content, sentiment })`

Sem `user_id`, o Postgres rejeita com "new row violates row-level security policy".

## Correções

Arquivo único: `src/routes/index.tsx`

1. **Check-in de hábito (`checkIn`, ~linha 341)**
   - Antes do insert, obter o usuário autenticado com `supabase.auth.getUser()`.
   - Se não houver usuário, mostrar `toast.error("Sessão expirada")` e abortar.
   - Insert passa a ser:
     ```ts
     .insert({ habit_id: habit.id, completed_at: today, user_id: user.id })
     ```

2. **Salvar reflexão do Journal (`save`, ~linha 525)**
   - Mesma checagem com `supabase.auth.getUser()`.
   - Insert passa a ser:
     ```ts
     .insert({ content, sentiment, user_id: user.id })
     ```

3. **Otimização opcional (recomendada):** usar `useAuth()` (já disponível via `AuthContext`) em vez de chamar `supabase.auth.getUser()` a cada ação — pega `user.id` direto do contexto, evitando uma round-trip extra. Vou aplicar essa abordagem.

## Notas

- Os SELECTs (`load`, `probe`, lista de hábitos) não precisam de mudança: o RLS já filtra por `auth.uid()` automaticamente.
- O modal "Novo Hábito"/"Nova Meta" já envia `user_id` — não será tocado.
- Nenhuma mudança de schema ou migração necessária.

## Arquivos editados

- `src/routes/index.tsx` (2 funções: `checkIn` e `save` do Journal)

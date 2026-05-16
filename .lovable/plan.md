# Plano de implementação — NOC SLA, Kanban Semanal & Sync

## 1. Banco de dados

Migração única:

- **`user_preferences`**: adicionar coluna `workout_schedule TEXT[]` (default `{Dom,Seg,Ter,Qua,Qui,Sex,Sab}`), e habilitar RLS com política `auth.uid() = user_id` (a tabela hoje não tem nenhuma — vou criar SELECT/INSERT/UPDATE).
- Garantir que `todo_list.sort_order`, `habits.sort_order` e `habits.repeat_days` existem (já existem) — apenas confirmar índices para performance.

> Reaproveito o array existente `workout_days` apenas se você preferir; abaixo sigo seu pedido literal usando `workout_schedule`.

## 2. Dependências

- `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` (mais robusto e mantido que react-beautiful-dnd, compatível com React 19).

## 3. Monitor de Disciplinas (NOC SLA — Treinos)

Em `src/components/SystemStatus.tsx` (ou onde mora hoje o botão "Registrar Treino"):

- Adicionar botão ícone (engrenagem `Settings`) ao lado de "Registrar Treino".
- Modal (Dialog) com 7 toggles (Dom…Sáb) — lê/grava `user_preferences.workout_schedule` via `upsert` por `user_id`.
- **Lógica de status** (badge no painel):
  - Hoje ∈ schedule e nenhum workout hoje → `STATUS: ALERTA` (vermelho `bg-destructive`).
  - Workout registrado hoje → `STATUS: ESTÁVEL` (verde esmeralda).
  - Hoje ∉ schedule → `STATUS: OFF-SCHEDULE / REPOUSO` (verde esmeralda discreto).

## 4. Kanban Semanal Drag-and-Drop

Refatorar `DojoTab` (Visão Geral) e a aba **To-Do** em `src/routes/index.tsx` para usar `@dnd-kit`:

- 7 colunas persistentes (Dom→Sáb) sempre visíveis, mesmo vazias.
- Cada coluna = `SortableContext` (vertical) com cards `useSortable`.
- Empty state: card pontilhado `Status: Vazio`.
- **DragOverlay** com `rotate-2` + `shadow-xl` + borda esmeralda (dark) / `#545B62` (light).

### Persistência no drop

- **To-Do (`todo_list`)**:
  - Mesma coluna → reordena → `upsert` em lote dos `sort_order` da coluna.
  - Coluna diferente → atualiza `scheduled_date` para a data ISO daquele dia da semana atual + recomputa `sort_order`.
- **Dojo (`habits`)**:
  - Mesma coluna → `upsert` em lote de `sort_order`.
  - Coluna diferente → `repeat_days = (repeat_days \ [origem]) ∪ [destino]`; se vazio, força `recurrence_type='continuous'` apenas se já era intervalado.

Tudo via `supabase.from(t).upsert(rows, { onConflict: 'id' })`.

### Sync sem F5

- Otimismo local: aplica mudança no estado antes do upsert; em erro faz rollback + toast.
- Re-fetch leve após upsert garante consistência (já é o padrão atual via `load()`).

## 5. Tema NOC

Tokens em `src/styles.css` (se já não existirem):
- `--noc-emerald` (dark accent), `--noc-graphite: #545B62` (light accent).
- Aplicados em: cabeçalho de coluna, botões ativos do seletor de dias, borda do card arrastado, badge SLA.

## 6. Arquivos editados / criados

- `supabase/migrations/<timestamp>_workout_schedule.sql`
- `src/routes/index.tsx` — Kanban DnD para Dojo e To-Do, integração schedule.
- `src/components/SystemStatus.tsx` — botão engrenagem, modal, lógica SLA.
- `src/styles.css` — tokens NOC.
- `package.json` — dnd-kit.

## 7. Fora de escopo (confirme se quer incluir)

- Realtime via canal Postgres Changes (hoje o app não usa). Mantenho o padrão atual (refetch após mutação) — me avise se quer adicionar `supabase.channel()` para multi-device live sync.
- Hábitos contínuos no Kanban: aparecerão em todas as 7 colunas (comportamento atual). Mover um contínuo entre colunas vai convertê-lo em intervalado com `repeat_days=[destino]`.

Confirma para eu seguir?

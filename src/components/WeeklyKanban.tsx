import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export const KANBAN_WEEK: { code: string; label: string; full: string; jsDay: number }[] = [
  { code: "Dom", label: "Dom", full: "Domingo", jsDay: 0 },
  { code: "Seg", label: "Seg", full: "Segunda", jsDay: 1 },
  { code: "Ter", label: "Ter", full: "Terça", jsDay: 2 },
  { code: "Qua", label: "Qua", full: "Quarta", jsDay: 3 },
  { code: "Qui", label: "Qui", full: "Quinta", jsDay: 4 },
  { code: "Sex", label: "Sex", full: "Sexta", jsDay: 5 },
  { code: "Sáb", label: "Sáb", full: "Sábado", jsDay: 6 },
];

export type KanbanItem = { id: string; raw?: any };
export type KanbanColumn = { code: string; label: string; full: string; items: KanbanItem[] };

type Props = {
  columns: KanbanColumn[];
  todayCode?: string;
  onReorder: (columnCode: string, orderedIds: string[]) => void;
  onMove: (itemId: string, fromCol: string, toCol: string, insertIndex: number) => void;
  renderCard: (item: KanbanItem, opts: { isDragging: boolean }) => ReactNode;
  emptyHint?: string;
};

function findColumnOf(columns: KanbanColumn[], id: string): KanbanColumn | undefined {
  return columns.find((c) => c.items.some((it) => it.id === id) || c.code === id);
}

export function WeeklyKanban({
  columns,
  todayCode,
  onReorder,
  onMove,
  renderCard,
  emptyHint = "Status: Vazio",
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    for (const c of columns) {
      const it = c.items.find((i) => i.id === activeId);
      if (it) return it;
    }
    return null;
  }, [activeId, columns]);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    const fromCol = findColumnOf(columns, activeIdStr);
    const overCol = findColumnOf(columns, overIdStr);
    if (!fromCol || !overCol) return;

    if (fromCol.code === overCol.code) {
      // Reorder within same column
      const ids = fromCol.items.map((i) => i.id);
      const oldIndex = ids.indexOf(activeIdStr);
      const newIndex =
        overIdStr === overCol.code ? ids.length - 1 : ids.indexOf(overIdStr);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const next = [...ids];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, activeIdStr);
      onReorder(fromCol.code, next);
    } else {
      // Move across columns
      const insertIndex =
        overIdStr === overCol.code
          ? overCol.items.length
          : Math.max(0, overCol.items.findIndex((i) => i.id === overIdStr));
      onMove(activeIdStr, fromCol.code, overCol.code, insertIndex);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {columns.map((col) => (
          <KanbanColumnView
            key={col.code}
            column={col}
            isToday={col.code === todayCode}
            renderCard={renderCard}
            activeId={activeId}
            emptyHint={emptyHint}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="rotate-2 shadow-xl kanban-drag-overlay">
            {renderCard(activeItem, { isDragging: true })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumnView({
  column,
  isToday,
  renderCard,
  activeId,
  emptyHint,
}: {
  column: KanbanColumn;
  isToday: boolean;
  renderCard: Props["renderCard"];
  activeId: string | null;
  emptyHint: string;
}) {
  const ids = column.items.map((i) => i.id);
  // Make column itself a droppable via SortableContext id list
  return (
    <div
      className={cn(
        "flex min-h-[180px] flex-col rounded-lg border bg-card/40 p-2 backdrop-blur transition-all",
        isToday
          ? "border-primary/60 shadow-[var(--shadow-glow)]"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--kanban-accent,theme(colors.primary.DEFAULT))]">
        <span>{column.label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {column.items.length}
        </span>
      </div>
      <SortableContext id={column.code} items={ids} strategy={verticalListSortingStrategy}>
        <DroppableArea columnCode={column.code} hasItems={column.items.length > 0}>
          {column.items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 p-3 text-center opacity-60">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {emptyHint}
              </span>
            </div>
          ) : (
            column.items.map((item) => (
              <SortableCard
                key={item.id}
                item={item}
                renderCard={renderCard}
                isActive={activeId === item.id}
              />
            ))
          )}
        </DroppableArea>
      </SortableContext>
    </div>
  );
}

// A wrapper that acts as a droppable target via useSortable on the column id
// (handled by SortableContext + a sentinel sortable item using column.code).
// We use a simple flex container; the DnD library uses SortableContext items
// to compute drop positions; if list is empty we still need a droppable —
// we add an invisible sortable using the column code.
function DroppableArea({
  columnCode,
  hasItems,
  children,
}: {
  columnCode: string;
  hasItems: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      {children}
      {/* Sentinel item enables drops onto empty / bottom of column */}
      <ColumnSentinel id={columnCode} hidden={hasItems} />
    </div>
  );
}

function ColumnSentinel({ id, hidden }: { id: string; hidden: boolean }) {
  const { setNodeRef, isOver } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      aria-hidden
      className={cn(
        "min-h-[12px] rounded transition-colors",
        isOver ? "bg-primary/10 ring-2 ring-primary/40" : "",
        hidden ? "opacity-0 pointer-events-none" : "",
      )}
    />
  );
}

function SortableCard({
  item,
  renderCard,
  isActive,
}: {
  item: KanbanItem;
  renderCard: Props["renderCard"];
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isActive ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderCard(item, { isDragging: false })}
    </div>
  );
}

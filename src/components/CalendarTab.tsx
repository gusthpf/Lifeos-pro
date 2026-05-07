import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Calendar, dateFnsLocalizer, type View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import * as AuthCtx from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarDays, CheckCircle2, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import "react-big-calendar/lib/css/react-big-calendar.css";

export const SALVADOR_TZ = "America/Bahia";

const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type Appointment = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  completed_at: string | null;
};

type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  completed: boolean;
};

function toLocalInput(d: Date): string {
  // Format Date (already represents an instant) into "yyyy-MM-dd'T'HH:mm" in Salvador TZ
  const z = toZonedTime(d, SALVADOR_TZ);
  return format(z, "yyyy-MM-dd'T'HH:mm");
}

function fromLocalInput(value: string): Date {
  // Interpret the input string as Salvador local time
  return fromZonedTime(value, SALVADOR_TZ);
}

export function CalendarTab() {
  const { user } = AuthCtx.useAuth();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [form, setForm] = useState({ title: "", description: "", start: "", end: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("appointments")
      .select("id,title,description,start_time,end_time,completed_at" as any)
      .order("start_time", { ascending: true });
    if (error) {
      toast.error("Falha ao carregar compromissos", { description: "Tente novamente mais tarde." });
      return;
    }
    const parsed: CalEvent[] = ((data ?? []) as any as Appointment[]).map((a) => {
      const start = new Date(a.start_time);
      const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        start,
        end,
        completed: !!a.completed_at,
      };
    });
    setEvents(parsed);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate(slotStart: Date, slotEnd?: Date) {
    setEditing(null);
    const s = slotStart;
    const e = slotEnd ?? new Date(slotStart.getTime() + 60 * 60 * 1000);
    setForm({
      title: "",
      description: "",
      start: toLocalInput(s),
      end: toLocalInput(e),
    });
    setOpen(true);
  }

  function openEdit(ev: CalEvent) {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      start: toLocalInput(ev.start),
      end: toLocalInput(ev.end),
    });
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Sessão expirada");
      return;
    }
    if (!form.title.trim() || !form.start) {
      toast.error("Título e início são obrigatórios");
      return;
    }
    setSaving(true);
    const start_time = fromLocalInput(form.start).toISOString();
    const end_time = form.end ? fromLocalInput(form.end).toISOString() : null;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time,
      end_time,
      user_id: user.id,
    };
    const { error } = editing
      ? await supabase.from("appointments").update(payload).eq("id", editing.id)
      : await supabase.from("appointments").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Falha ao salvar", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success(editing ? "Compromisso atualizado" : "Compromisso criado");
    setOpen(false);
    load();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm(`Excluir "${editing.title}"?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("appointments").delete().eq("id", editing.id);
    setDeleting(false);
    if (error) {
      toast.error("Falha ao excluir", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Compromisso excluído");
    setOpen(false);
    load();
  }

  async function toggleComplete() {
    if (!editing) return;
    const newCompleted = !editing.completed;
    const { error } = await supabase
      .from("appointments")
      .update({ completed_at: newCompleted ? new Date().toISOString() : null } as any)
      .eq("id", editing.id);
    if (error) {
      toast.error("Falha ao atualizar", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success(newCompleted ? "Compromisso concluído" : "Compromisso reaberto");
    setOpen(false);
    load();
  }

  const messages = useMemo(
    () => ({
      today: "Hoje",
      previous: "Anterior",
      next: "Próximo",
      month: "Mês",
      week: "Semana",
      day: "Dia",
      agenda: "Agenda",
      date: "Data",
      time: "Hora",
      event: "Compromisso",
      noEventsInRange: "Sem compromissos neste período.",
      showMore: (n: number) => `+${n} mais`,
    }),
    [],
  );

  return (
    <Card className="border-border/60 bg-card/70 shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" /> Calendário
        </CardTitle>
        <Button size="sm" onClick={() => openCreate(new Date())} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rbc-theme h-[680px] w-full">
          <Calendar
            localizer={localizer}
            culture="pt-BR"
            events={events}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            selectable
            popup
            messages={messages}
            startAccessor="start"
            endAccessor="end"
            onSelectSlot={(slot) => openCreate(slot.start as Date, slot.end as Date)}
            onSelectEvent={(ev) => openEdit(ev as CalEvent)}
            eventPropGetter={(ev) =>
              (ev as CalEvent).completed
                ? {
                    style: {
                      backgroundColor: "hsl(var(--muted))",
                      color: "hsl(var(--muted-foreground))",
                      textDecoration: "line-through",
                      opacity: 0.7,
                    },
                  }
                : {}
            }
            style={{ height: "100%" }}
          />
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
              <DialogDescription>Horário no fuso de Salvador (GMT-3).</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="appt-title">Título</Label>
              <Input
                id="appt-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Reunião, consulta, treino..."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appt-desc">Descrição</Label>
              <Textarea
                id="appt-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes opcionais"
                rows={3}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appt-start">Início</Label>
                <Input
                  id="appt-start"
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appt-end">Fim</Label>
                <Input
                  id="appt-end"
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              {editing ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={remove}
                  disabled={deleting}
                  className="gap-1.5"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Excluir
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** Hook: alerta na carga do dashboard sobre compromissos de hoje (Salvador). */
export function useTodayAppointmentsAlert() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const nowZ = toZonedTime(new Date(), SALVADOR_TZ);
      const yyyy = nowZ.getFullYear();
      const mm = String(nowZ.getMonth() + 1).padStart(2, "0");
      const dd = String(nowZ.getDate()).padStart(2, "0");
      const dayStart = fromZonedTime(`${yyyy}-${mm}-${dd}T00:00`, SALVADOR_TZ);
      const dayEnd = fromZonedTime(`${yyyy}-${mm}-${dd}T23:59`, SALVADOR_TZ);
      const { data } = await supabase
        .from("appointments")
        .select("id,title,start_time")
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())
        .order("start_time", { ascending: true });
      if (cancelled || !data || data.length === 0) return;
      const list = data
        .map((a: any) => {
          const z = toZonedTime(new Date(a.start_time), SALVADOR_TZ);
          return `${format(z, "HH:mm")} — ${a.title}`;
        })
        .join("\n");
      toast("⚠️ Compromissos de Hoje", {
        description: list,
        duration: 10000,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

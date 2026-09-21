import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as AuthCtx from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BrainCircuit, Copy, Check, Trash2, Loader2 } from "lucide-react";

const MODULES = ["Power BI / DAX", "SQL", "Power Automate", "Python", "Outros"] as const;

type StudyNote = {
  id: string;
  module: string;
  title: string;
  explanation: string | null;
  code_snippet: string | null;
  created_at: string;
};

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="relative mt-3 rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
      <Button
        size="icon"
        variant="ghost"
        onClick={copy}
        aria-label="Copiar código"
        className="absolute top-2 right-2 h-7 w-7 text-gray-400 hover:text-emerald-400 hover:bg-gray-800"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="p-4 pr-12 overflow-x-auto text-sm font-mono text-emerald-300/90 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CerebroDigitalTab() {
  const { user } = AuthCtx.useAuth();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [module, setModule] = useState<string>(MODULES[0]);
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("study_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar anotações.");
    else setNotes((data ?? []) as StudyNote[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Informe um título.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("study_notes").insert({
      module,
      title: title.trim(),
      explanation: explanation.trim() || null,
      code_snippet: code.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar anotação.");
      return;
    }
    toast.success("Anotação registrada no Cérebro Digital.");
    setTitle("");
    setExplanation("");
    setCode("");
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Excluir esta anotação definitivamente?")) return;
    const { error } = await supabase.from("study_notes").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir.");
    else {
      toast.success("Anotação removida.");
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário recolhível */}
      <Accordion
        type="single"
        collapsible
        value={formOpen ? "form" : ""}
        onValueChange={(v) => setFormOpen(v === "form")}
        className="rounded-xl border border-border bg-card/60 backdrop-blur px-5"
      >
        <AccordionItem value="form" className="border-none">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold tracking-tight">
                Adicionar Nova Anotação
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
        <div className="space-y-4 pb-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Módulo</label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Título</label>
            <Input
              className="mt-1"
              placeholder="Ex: Medida DAX para acumulado mensal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Explicação</label>
            <Textarea
              className="mt-1 min-h-[100px]"
              placeholder="Descreva o conceito, quando usar, armadilhas..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Código</label>
            <Textarea
              className="mt-1 min-h-[140px] font-mono text-sm"
              placeholder="Cole aqui o snippet de código..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Anotação
          </Button>
        </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Feed */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Feed de Anotações</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma anotação ainda. Use o formulário acima para registrar a primeira.
          </p>
        ) : (
          notes.map((n) => (
            <article
              key={n.id}
              className="rounded-xl border border-border bg-card/60 backdrop-blur p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] uppercase tracking-widest text-primary">
                    {n.module}
                  </span>
                  <h3 className="mt-2 font-semibold tracking-tight">{n.title}</h3>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(n.id)}
                  aria-label="Excluir anotação"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {n.explanation && (
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {n.explanation}
                </p>
              )}
              {n.code_snippet && <CodeBlock code={n.code_snippet} />}
              <p className="mt-3 text-[11px] text-muted-foreground/70">
                {new Date(n.created_at).toLocaleString("pt-BR")}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

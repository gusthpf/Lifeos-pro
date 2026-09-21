import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Trash2, Loader2, Mic, X } from "lucide-react";

type Project = {
  id: string;
  title: string;
  scenario_pain: string;
  technical_solution: string;
  business_impact: string;
  tech_stack: string | null;
  created_at: string;
};

function parseStack(stack: string | null): string[] {
  return (stack ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProjectsPortfolioTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interview, setInterview] = useState<Project | null>(null);

  const [title, setTitle] = useState("");
  const [pain, setPain] = useState("");
  const [solution, setSolution] = useState("");
  const [impact, setImpact] = useState("");
  const [stack, setStack] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects_portfolio")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar o portfólio.");
    else setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Informe o título da iniciativa.");
      return;
    }
    if (!pain.trim() || !solution.trim() || !impact.trim()) {
      toast.error("Preencha a dor, a solução e o impacto.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("projects_portfolio").insert({
      title: title.trim(),
      scenario_pain: pain.trim(),
      technical_solution: solution.trim(),
      business_impact: impact.trim(),
      tech_stack: stack.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar projeto.");
      return;
    }
    toast.success("Projeto registrado no Portfólio.");
    setTitle("");
    setPain("");
    setSolution("");
    setImpact("");
    setStack("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("projects_portfolio").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir.");
    else {
      toast.success("Projeto removido.");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário */}
      <section className="rounded-xl border border-border bg-card/60 backdrop-blur p-5 h-fit">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Nova Iniciativa</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Título da Iniciativa
            </label>
            <Input
              className="mt-1"
              placeholder="Ex: Automação de fechamento mensal no Power BI"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              O Cenário / A Dor
            </label>
            <Textarea
              className="mt-1 min-h-[90px]"
              placeholder="Qual era o problema? Quem sofria com ele? Quanto custava?"
              value={pain}
              onChange={(e) => setPain(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              A Solução Técnica
            </label>
            <Textarea
              className="mt-1 min-h-[90px]"
              placeholder="Como você resolveu? Arquitetura, ferramentas, decisões..."
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              O Impacto Gerado
            </label>
            <Textarea
              className="mt-1 min-h-[90px]"
              placeholder="Números, horas economizadas, receita, redução de erro..."
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Stack Tecnológico
            </label>
            <Input
              className="mt-1"
              placeholder="Power BI, SQL, Python, Power Automate..."
              value={stack}
              onChange={(e) => setStack(e.target.value)}
            />
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Projeto
          </Button>
        </div>
      </section>

      {/* Feed */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Feed de Projetos</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum projeto ainda. Registre a primeira iniciativa ao lado.
          </p>
        ) : (
          projects.map((p) => (
            <article
              key={p.id}
              className="rounded-xl border border-border bg-card/60 backdrop-blur p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold tracking-tight">{p.title}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInterview(p)}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Mic className="h-3.5 w-3.5" /> Modo Entrevista
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(p.id)}
                    aria-label="Excluir projeto"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {parseStack(p.tech_stack).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {parseStack(p.tech_stack).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                {p.business_impact}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground/70">
                {new Date(p.created_at).toLocaleString("pt-BR")}
              </p>
            </article>
          ))
        )}
      </section>

      {/* Modo Entrevista */}
      <Dialog open={!!interview} onOpenChange={(o) => !o && setInterview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogDescription className="mb-1 text-[10px] font-mono uppercase tracking-[0.25em]">
                  Roteiro de Entrevista
                </DialogDescription>
                <DialogTitle className="text-xl tracking-tight">
                  {interview?.title}
                </DialogTitle>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setInterview(null)}
                aria-label="Fechar"
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {interview && (
            <div className="space-y-6 pt-2">
              {parseStack(interview.tech_stack).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parseStack(interview.tech_stack).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  O Cenário / A Dor
                </h4>
                <p className="mt-2 text-base leading-relaxed whitespace-pre-wrap">
                  {interview.scenario_pain}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  A Solução Técnica
                </h4>
                <p className="mt-2 text-base leading-relaxed whitespace-pre-wrap">
                  {interview.technical_solution}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  O Impacto Gerado
                </h4>
                <p className="mt-2 text-base leading-relaxed whitespace-pre-wrap">
                  {interview.business_impact}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

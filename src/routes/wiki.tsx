import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as AuthCtx from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Search, ArrowLeft, Loader2, Copy, FileDown } from "lucide-react";
import { SystemStatus } from "@/components/SystemStatus";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/wiki")({
  head: () => ({
    meta: [
      { title: "Wiki Técnica — Life OS - Pro Manager" },
      {
        name: "description",
        content:
          "Sua base de conhecimento técnica: soluções salvas pelo Nexus, pesquisáveis por título, conteúdo e tags.",
      },
      { property: "og:title", content: "Wiki Técnica — Life OS - Pro Manager" },
      {
        property: "og:description",
        content:
          "Pesquise as soluções e referências técnicas que você salvou na sua Wiki pessoal.",
      },
      { property: "og:url", content: "https://lifementor.lovable.app/wiki" },
    ],
    links: [{ rel: "canonical", href: "https://lifementor.lovable.app/wiki" }],
  }),
  component: WikiPage,
});


type WikiEntry = {
  id: string;
  titulo: string;
  solucao: string;
  tags: string[] | null;
  criado_em: string | null;
};

function WikiPage() {
  const { user, loading } = AuthCtx.useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WikiEntry[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("kb_tecnica")
        .select("id,titulo,solucao,tags,criado_em")
        .order("criado_em", { ascending: false });
      if (error) {
        setEntries([]);
        return;
      }
      setEntries((data ?? []) as WikiEntry[]);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (!entries) return null;
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const tagStr = (e.tags ?? []).join(" ").toLowerCase();
      return (
        e.titulo.toLowerCase().includes(q) ||
        e.solucao.toLowerCase().includes(q) ||
        tagStr.includes(q)
      );
    });
  }, [entries, query]);

  function buildMarkdown(items: WikiEntry[]): string {
    const header = `# Wiki Técnica\n\n_Exportado em ${new Date().toLocaleString("pt-BR")} · ${items.length} entradas_\n\n---\n\n`;
    const body = items
      .map((e) => {
        const date = e.criado_em
          ? new Date(e.criado_em).toLocaleDateString("pt-BR")
          : "";
        const tags = (e.tags ?? []).length ? `**Tags:** ${(e.tags ?? []).map((t) => `\`${t}\``).join(", ")}\n\n` : "";
        return `## ${e.titulo}\n\n${date ? `_${date}_\n\n` : ""}${tags}\`\`\`\n${e.solucao}\n\`\`\`\n`;
      })
      .join("\n---\n\n");
    return header + body;
  }

  async function copyMarkdown() {
    const items = filtered ?? [];
    if (items.length === 0) {
      toast.error("Nada para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildMarkdown(items));
      toast.success(`Markdown copiado (${items.length} entradas).`);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  function exportPdf() {
    const items = filtered ?? [];
    if (items.length === 0) {
      toast.error("Nada para exportar.");
      return;
    }
    const esc = (s: string) =>
      s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const cards = items
      .map((e) => {
        const date = e.criado_em
          ? new Date(e.criado_em).toLocaleDateString("pt-BR")
          : "";
        const tags = (e.tags ?? [])
          .map((t) => `<span class="tag">${esc(t)}</span>`)
          .join(" ");
        return `<article>
  <h2>${esc(e.titulo)}</h2>
  <div class="meta">${date}${tags ? " · " + tags : ""}</div>
  <pre>${esc(e.solucao)}</pre>
</article>`;
      })
      .join("\n");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Wiki Técnica</title>
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.5; }
  header { border-bottom: 2px solid #111; margin-bottom: 18px; padding-bottom: 8px; }
  h1 { margin:0; font-size: 22px; }
  .sub { color:#555; font-size: 12px; margin-top: 4px; }
  article { page-break-inside: avoid; margin: 16px 0 22px; }
  h2 { font-size: 15px; margin: 0 0 4px; }
  .meta { color:#666; font-size: 11px; margin-bottom: 6px; }
  .tag { display:inline-block; background:#eef; border:1px solid #cce; border-radius: 10px; padding: 1px 8px; font-size: 10px; margin-right: 4px; color:#224; }
  pre { background:#f6f6f8; border:1px solid #e3e3ea; border-radius:6px; padding:10px 12px; font-size: 11px; white-space: pre-wrap; word-wrap: break-word; font-family: ui-monospace, Menlo, Consolas, monospace; }
</style></head><body>
<header><h1>Wiki Técnica</h1><div class="sub">Exportado em ${new Date().toLocaleString("pt-BR")} · ${items.length} entradas</div></header>
${cards}
<script>window.onload = () => { setTimeout(() => window.print(), 200); };</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para exportar PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }


  return (
    <div className="min-h-screen text-foreground">
      <Toaster theme="dark" position="top-center" richColors />
      <header className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <BookMarked className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Wiki Técnica</h1>
              <p className="text-sm text-muted-foreground">
                Soluções salvas do Nexus, pesquisáveis e organizadas por tags.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SystemStatus />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por título, conteúdo ou tag…"
              className="pl-9 h-11"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={copyMarkdown}
              disabled={!entries || entries.length === 0}
            >
              <Copy className="h-4 w-4" /> Copiar Markdown
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={exportPdf}
              disabled={!entries || entries.length === 0}
            >
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        </div>

        {entries === null ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando entradas…
          </div>
        ) : filtered && filtered.length === 0 ? (
          <Card className="border-dashed bg-card/40">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <BookMarked className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {entries.length === 0
                  ? "Nenhuma solução salva ainda. Use o Nexus para salvar respostas técnicas (+25 XP)."
                  : "Nenhum resultado para sua busca."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(filtered ?? []).map((e) => (
              <Card
                key={e.id}
                className="border-border bg-card/70 backdrop-blur"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug">{e.titulo}</CardTitle>
                  <div className="flex items-center gap-2 pt-1">
                    {e.criado_em && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {(e.tags ?? []).slice(0, 6).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-primary/20 bg-black/40 p-3 text-xs leading-relaxed text-foreground/90">
                    {e.solucao}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

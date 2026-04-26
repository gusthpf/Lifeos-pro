import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as AuthCtx from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Search, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/wiki")({
  head: () => ({
    meta: [
      { title: "Wiki Técnica — AI Life Coach" },
      {
        name: "description",
        content:
          "Sua base de conhecimento técnica: soluções salvas pelo Nexus, pesquisáveis por título, conteúdo e tags.",
      },
      { property: "og:title", content: "Wiki Técnica — AI Life Coach" },
      {
        property: "og:description",
        content:
          "Pesquise as soluções e referências técnicas que você salvou na sua Wiki pessoal.",
      },
    ],
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

  return (
    <div className="min-h-screen text-foreground">
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
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por título, conteúdo ou tag…"
            className="pl-9 h-11"
          />
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

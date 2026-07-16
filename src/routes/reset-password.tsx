import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Life OS - Pro Manager" },
      {
        name: "description",
        content: "Defina uma nova senha de acesso ao console Life OS - Pro Manager.",
      },
      { property: "og:title", content: "Redefinir senha — Life OS - Pro Manager" },
      {
        property: "og:description",
        content: "Fluxo seguro de redefinição de senha do Life OS.",
      },
      { property: "og:url", content: "https://lifementor.lovable.app/reset-password" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://lifementor.lovable.app/reset-password" }],
  }),
  component: ResetPasswordPage,
});


function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery token from the URL hash and creates a session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Senha muito curta", { description: "Use pelo menos 6 caracteres." });
      return;
    }
    if (password !== confirm) {
      toast.error("Senhas não conferem", { description: "Verifique a confirmação da nova senha." });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      console.error("updateUser error", error);
      toast.error("Falha ao atualizar senha", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Senha redefinida!", {
      description: "Acesso reativado. Redirecionando...",
      className:
        "!bg-zinc-950 !text-emerald-50 !border-2 !border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)]",
    });
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/auth" }), 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground">
      <Toaster theme="dark" position="top-center" richColors />
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-400" /> Redefinir senha
            </CardTitle>
            <CardDescription>
              {ready
                ? "Defina sua nova senha de acesso operacional."
                : "Validando link de recuperação..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar nova senha
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Aguardando confirmação do link...
              </div>
            )}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/auth" className="underline">Voltar para o login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

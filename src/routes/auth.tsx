import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast, Toaster } from "sonner";
import { Loader2, Sparkles, KeyRound } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Life OS - Pro Manager" },
      { name: "description", content: "Console de monitoramento de performance pessoal com estética e lógica de NOC." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  // If already logged in, bounce to home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    const target = (resetEmail || email).trim();
    if (!target) {
      toast.error("Informe seu e-mail", { description: "Digite o e-mail cadastrado para receber o link." });
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) {
      console.error("resetPassword error", error);
      toast.error("Falha ao enviar link", { description: "Tente novamente mais tarde." });
      return;
    }
    toast.success("Link enviado!", {
      description: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
      duration: 8000,
      className:
        "!bg-zinc-950 !text-emerald-50 !border-2 !border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)]",
    });
    setResetOpen(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      console.error("signIn error", error);
      const isUnconfirmed = /confirm/i.test(error.message) || /not confirmed/i.test(error.message);
      if (isUnconfirmed) {
        toast.error("Acesso ainda não ativado", {
          description: "Confirme o link enviado ao seu e-mail para ativar seu acesso operacional.",
          className: "border-emerald-500/60",
        });
      } else {
        toast.error("Falha ao entrar", { description: "Verifique suas credenciais." });
      }
      return;
    }
    if (!data.user?.email_confirmed_at && !data.user?.confirmed_at) {
      await supabase.auth.signOut();
      toast.error("E-mail não confirmado", {
        description: "Verifique sua caixa de entrada e ative seu acesso antes de prosseguir.",
      });
      return;
    }
    toast.success("Login realizado!");
    navigate({ to: "/" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setLoading(false);
      console.error("signUp error", error);
      toast.error("Falha ao criar conta", { description: "Tente novamente mais tarde." });
      return;
    }
    // Create profile row if a session exists immediately (email confirmation off)
    if (data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, full_name: fullName }, { onConflict: "id" });
    }
    setLoading(false);
    toast.success("Acesso solicitado!", {
      description:
        "Enviamos um link de confirmação para o seu e-mail. Verifique-o para ativar seu acesso operacional.",
      duration: 8000,
      className:
        "!bg-zinc-950 !text-emerald-50 !border-2 !border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)]",
    });
    if (data.session) {
      // Force confirmation flow: do not enter dashboard until email is confirmed
      await supabase.auth.signOut();
    }
    setTab("signin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground">
      <Toaster theme="dark" position="top-center" richColors />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Life OS - Pro Manager</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>Entre ou crie uma conta para começar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetOpen(true);
                    }}
                    className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-emerald-400 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/" className="underline">Voltar para a home</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md border-emerald-500/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-400" /> Recuperar acesso
            </DialogTitle>
            <DialogDescription>
              Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetting}>
              {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

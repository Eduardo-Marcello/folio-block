import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { ArrowRight, Blocks, Loader2, MailCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { buscarMeuPerfil } from "@/lib/folio-api";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — NoCode Folio" },
      { name: "description", content: "Crie ou gerencie sua página NoCode Folio." },
      { property: "og:title", content: "Entrar — NoCode Folio" },
      { property: "og:description", content: "Crie ou gerencie sua página NoCode Folio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const CHAVE_ULTIMO_EMAIL = "folio:ultimo-email";

function AuthPage() {
  const navigate = useNavigate();
  // Lembra o último e-mail usado (só conveniência; nada sensível além do próprio e-mail).
  const [email, setEmail] = useState(() => {
    try {
      return window.localStorage.getItem(CHAVE_ULTIMO_EMAIL) ?? "";
    } catch {
      return "";
    }
  });
  const [enviando, setEnviando] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("code"),
  );
  const redirecionou = useRef(false);

  useEffect(() => {
    async function seguir(user: User) {
      if (redirecionou.current) return;
      redirecionou.current = true;
      setEntrando(true);
      try {
        const perfil = await buscarMeuPerfil(user.id);
        if (!perfil || user.user_metadata?.["onboarding_concluido"] !== true)
          await navigate({ to: "/onboarding", replace: true });
        else await navigate({ to: "/$slug", params: { slug: perfil.slug }, replace: true });
      } catch {
        redirecionou.current = false;
        setEntrando(false);
        toast.error("Não foi possível carregar seu perfil");
      }
    }

    const params = new URLSearchParams(window.location.search);
    const erroUrl = params.get("error_description");
    if (erroUrl) toast.error(erroUrl);

    // getSession aguarda a troca do `?code=` (PKCE) pela sessão, quando vier do Magic Link/Google.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void seguir(data.session.user);
      else setEntrando(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === "SIGNED_IN" && session) void seguir(session.user);
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const redirectTo = () => `${window.location.origin}/auth`;

  async function enviarMagicLink(event: FormEvent) {
    event.preventDefault();
    const parsed = z.string().trim().toLowerCase().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Digite um e-mail válido");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: redirectTo() },
    });
    setEnviando(false);
    if (error) {
      toast.error(
        error.status === 429
          ? "Muitas tentativas. Aguarde um pouco e tente de novo."
          : "Não foi possível enviar o link",
      );
      return;
    }
    try {
      window.localStorage.setItem(CHAVE_ULTIMO_EMAIL, parsed.data);
    } catch {
      // localStorage indisponível (aba anônima/bloqueado): só não lembra o e-mail.
    }
    setEnviadoPara(parsed.data);
  }

  async function entrarComGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) toast.error("Login com Google indisponível no momento");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a href="/" className="mb-10 flex items-center gap-2 font-bold">
          <span className="brand-mark small">
            <Blocks />
          </span>
          NoCode Folio
        </a>

        {entrando ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            Entrando…
          </div>
        ) : enviadoPara ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-12 w-12 text-violet-400" />
            <h1 className="mt-5 text-2xl font-bold">Confira seu e-mail</h1>
            <p className="mt-3 text-slate-400">
              Enviamos um link de acesso para{" "}
              <strong className="text-slate-200">{enviadoPara}</strong>. Abra-o neste mesmo
              navegador.
            </p>
            <Button variant="ghost" className="mt-6" onClick={() => setEnviadoPara(null)}>
              Usar outro e-mail
            </Button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Bem-vindo</p>
            <h1 className="mt-3 text-3xl font-bold">Entre ou crie sua página</h1>
            <p className="mt-3 text-slate-400">
              Sem senha: enviamos um link mágico para o seu e-mail.
            </p>
            <form onSubmit={(event) => void enviarMagicLink(event)} className="mt-8 grid gap-4">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                required
                className="h-12 rounded-xl"
              />
              <Button
                type="submit"
                variant="gradient"
                disabled={enviando}
                className="h-12 rounded-xl"
              >
                {enviando ? (
                  "Enviando…"
                ) : (
                  <>
                    Enviar Magic Link
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>
            <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-800" />
              ou
              <span className="h-px flex-1 bg-slate-800" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-xl"
              onClick={() => void entrarComGoogle()}
            >
              <GoogleIcon />
              Continuar com Google
            </Button>
          </>
        )}
      </section>
      <div className="auth-aside" aria-hidden="true">
        <Sparkles />
        <p>
          Sua internet,
          <br />
          organizada em blocos.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

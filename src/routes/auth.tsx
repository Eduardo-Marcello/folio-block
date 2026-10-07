import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { AuthError, User } from "@supabase/supabase-js";
import { ArrowRight, Blocks, KeyRound, Loader2, MailCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { buscarMeuPerfil } from "@/lib/folio-api";
import { slugSchema } from "@/lib/folio-types";

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
const TAMANHO_CODIGO = 6;

const emailSchema = z.string().trim().toLowerCase().email("Digite um e-mail válido");
const senhaSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .max(72, "A senha pode ter no máximo 72 caracteres")
  .regex(/[a-zA-Z]/, "A senha precisa ter pelo menos uma letra")
  .regex(/[0-9]/, "A senha precisa ter pelo menos um número");

const cadastroSchema = z
  .object({
    usuario: slugSchema,
    email: emailSchema,
    senha: senhaSchema,
    confirmacao: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: "As senhas não conferem",
    path: ["confirmacao"],
  });

type Modo = "entrar" | "cadastrar" | "verificar" | "esqueci" | "nova-senha";

function lerUltimoEmail() {
  try {
    return window.localStorage.getItem(CHAVE_ULTIMO_EMAIL) ?? "";
  } catch {
    return "";
  }
}

function lembrarEmail(email: string) {
  try {
    window.localStorage.setItem(CHAVE_ULTIMO_EMAIL, email);
  } catch {
    // localStorage indisponível (aba anônima/bloqueado): só não lembra o e-mail.
  }
}

function mensagemErro(erro: AuthError, padrao: string) {
  if (erro.status === 429) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (erro.code === "invalid_credentials") return "E-mail ou senha incorretos";
  if (erro.code === "user_already_exists")
    return "Este e-mail já tem cadastro. Entre com sua senha.";
  if (erro.code === "weak_password") return "Senha fraca. Use uma senha mais forte.";
  if (erro.code === "otp_expired") return "Código inválido ou expirado";
  return padrao;
}

function AuthPage() {
  const navigate = useNavigate();
  const parametros = new URLSearchParams(window.location.search);
  const veioDaRecuperacao = parametros.get("tipo") === "recuperar";

  const [modo, setModo] = useState<Modo>(veioDaRecuperacao ? "nova-senha" : "entrar");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState(lerUltimoEmail);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [entrando, setEntrando] = useState(
    () => parametros.has("code") || parametros.has("token_hash"),
  );
  const redirecionou = useRef(false);
  const verificouLink = useRef(false);
  const recuperando = useRef(veioDaRecuperacao);

  useEffect(() => {
    async function seguir(user: User) {
      // No link de "esqueci a senha" a sessão chega antes de o usuário definir a nova senha.
      if (redirecionou.current || recuperando.current) return;
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

    const erroUrl = new URLSearchParams(window.location.search).get("error_description");
    if (erroUrl) toast.error(erroUrl);

    // Link do e-mail no formato `/auth?token_hash=...&type=email` (template "Confirm signup").
    // Não depende de abrir no mesmo navegador, ao contrário do `?code=` do PKCE.
    const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
    if (tokenHash && !verificouLink.current) {
      verificouLink.current = true;
      setEntrando(true);
      window.history.replaceState(null, "", "/auth");
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" }).then(({ error }) => {
        if (!error) return; // O SIGNED_IN faz o redirecionamento.
        setEntrando(false);
        toast.error("Link inválido ou expirado. Entre com sua senha para receber um novo código.");
      });
    } else if (!verificouLink.current) {
      // getSession aguarda a troca do `?code=` (PKCE) pela sessão, quando vier de um link do e-mail.
      void supabase.auth.getSession().then(({ data }) => {
        setEntrando(false);
        if (data.session) void seguir(data.session.user);
        else if (recuperando.current) {
          recuperando.current = false;
          setModo("esqueci");
          toast.error("O link de recuperação expirou. Peça um novo.");
        }
      });
    }
    const { data: listener } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === "SIGNED_IN" && session) void seguir(session.user);
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const urlRetorno = (extra = "") => `${window.location.origin}/auth${extra}`;

  function trocarModo(novo: Modo) {
    setSenha("");
    setConfirmacao("");
    setCodigo("");
    setModo(novo);
  }

  async function entrar(event: FormEvent) {
    event.preventDefault();
    const parsed = z.object({ email: emailSchema, senha: z.string().min(1) }).safeParse({
      email,
      senha,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Preencha e-mail e senha");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
    });
    setEnviando(false);
    lembrarEmail(parsed.data.email);
    if (error) {
      if (error.code === "email_not_confirmed") {
        setEmail(parsed.data.email);
        await reenviarCodigo(parsed.data.email);
        trocarModo("verificar");
        return;
      }
      toast.error(mensagemErro(error, "Não foi possível entrar"));
    }
    // Sucesso: o onAuthStateChange (SIGNED_IN) faz o redirecionamento.
  }

  async function cadastrar(event: FormEvent) {
    event.preventDefault();
    const parsed = cadastroSchema.safeParse({ usuario, email, senha, confirmacao });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Confira os campos");
      return;
    }
    setEnviando(true);
    try {
      const { data: existente, error: erroBusca } = await supabase
        .from("perfis")
        .select("id")
        .eq("slug", parsed.data.usuario)
        .maybeSingle();
      if (erroBusca) throw erroBusca;
      if (existente) {
        toast.error("Este nome de usuário já está em uso");
        return;
      }

      // O trigger `ao_criar_usuario` grava o perfil no banco usando o `username` como endereço.
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.senha,
        options: {
          emailRedirectTo: urlRetorno(),
          data: { username: parsed.data.usuario },
        },
      });
      if (error) {
        toast.error(mensagemErro(error, "Não foi possível criar sua conta"));
        return;
      }
      lembrarEmail(parsed.data.email);
      setEmail(parsed.data.email);
      // Com "Confirm email" ligado, um e-mail já cadastrado volta sem identidades (sem erro, por privacidade).
      if (data.user && data.user.identities?.length === 0) {
        toast.error("Este e-mail já tem cadastro. Entre com sua senha.");
        trocarModo("entrar");
        return;
      }
      // Sem confirmação de e-mail no Supabase, a sessão já vem pronta e o SIGNED_IN redireciona.
      if (!data.session) trocarModo("verificar");
    } catch {
      toast.error("Não foi possível criar sua conta");
    } finally {
      setEnviando(false);
    }
  }

  async function verificarCodigo(event: FormEvent) {
    event.preventDefault();
    if (codigo.length !== TAMANHO_CODIGO) {
      toast.error(`Digite o código de ${TAMANHO_CODIGO} dígitos`);
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
    setEnviando(false);
    if (error) {
      setCodigo("");
      toast.error(mensagemErro(error, "Código inválido ou expirado"));
    }
  }

  async function reenviarCodigo(destino = email) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: destino,
      options: { emailRedirectTo: urlRetorno() },
    });
    if (error) toast.error(mensagemErro(error, "Não foi possível reenviar o código"));
    else toast.success("Enviamos um novo código para o seu e-mail");
  }

  async function pedirRecuperacao(event: FormEvent) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error("Digite um e-mail válido");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: urlRetorno("?tipo=recuperar"),
    });
    setEnviando(false);
    if (error) {
      toast.error(mensagemErro(error, "Não foi possível enviar o e-mail"));
      return;
    }
    // Mesma mensagem exista ou não a conta, para não revelar quais e-mails estão cadastrados.
    toast.success(
      "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha",
    );
    trocarModo("entrar");
  }

  async function salvarNovaSenha(event: FormEvent) {
    event.preventDefault();
    const parsed = senhaSchema.safeParse(senha);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem");
      return;
    }
    setEnviando(true);
    const { data, error } = await supabase.auth.updateUser({ password: parsed.data });
    setEnviando(false);
    if (error) {
      toast.error(mensagemErro(error, "Não foi possível salvar a nova senha"));
      return;
    }
    toast.success("Senha atualizada!");
    recuperando.current = false;
    window.history.replaceState(null, "", "/auth");
    // Sem novo SIGNED_IN aqui: segue manualmente.
    const perfil = await buscarMeuPerfil(data.user.id).catch(() => null);
    if (!perfil || data.user.user_metadata?.["onboarding_concluido"] !== true)
      await navigate({ to: "/onboarding", replace: true });
    else await navigate({ to: "/$slug", params: { slug: perfil.slug }, replace: true });
  }

  async function entrarComGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlRetorno() },
    });
    if (error) toast.error("Login com Google indisponível no momento");
  }

  const campoEmail = (
    <Campo rotulo="E-mail">
      <Input
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="seu@email.com"
        required
        className="h-12 rounded-xl"
      />
    </Campo>
  );

  function conteudo() {
    if (entrando)
      return (
        <div className="flex flex-col items-center gap-4 py-10 text-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          Entrando…
        </div>
      );

    if (modo === "verificar")
      return (
        <div className="text-center">
          <MailCheck className="mx-auto h-12 w-12 text-violet-400" />
          <h1 className="mt-5 text-2xl font-bold">Confirme seu e-mail</h1>
          <p className="mt-3 text-slate-400">
            Enviamos um código de {TAMANHO_CODIGO} dígitos para{" "}
            <strong className="text-slate-200">{email}</strong>. Digite-o abaixo ou clique no link
            do e-mail.
          </p>
          <form onSubmit={(event) => void verificarCodigo(event)} className="mt-8 grid gap-4">
            <InputOTP
              maxLength={TAMANHO_CODIGO}
              value={codigo}
              onChange={setCodigo}
              autoFocus
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {Array.from({ length: TAMANHO_CODIGO }, (_, indice) => (
                  <InputOTPSlot key={indice} index={indice} className="h-12 w-11 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <BotaoEnviar enviando={enviando} rotuloEnviando="Verificando…">
              Confirmar cadastro
            </BotaoEnviar>
          </form>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="ghost" onClick={() => void reenviarCodigo()}>
              Reenviar código
            </Button>
            <Button variant="ghost" onClick={() => trocarModo("entrar")}>
              Voltar
            </Button>
          </div>
        </div>
      );

    if (modo === "esqueci")
      return (
        <>
          <p className="eyebrow">Recuperar acesso</p>
          <h1 className="mt-3 text-3xl font-bold">Esqueceu a senha?</h1>
          <p className="mt-3 text-slate-400">Enviamos um link para você criar uma nova senha.</p>
          <form onSubmit={(event) => void pedirRecuperacao(event)} className="mt-8 grid gap-4">
            {campoEmail}
            <BotaoEnviar enviando={enviando} rotuloEnviando="Enviando…">
              Enviar link
            </BotaoEnviar>
          </form>
          <Button variant="ghost" className="mt-4 w-full" onClick={() => trocarModo("entrar")}>
            Voltar para o login
          </Button>
        </>
      );

    if (modo === "nova-senha")
      return (
        <>
          <KeyRound className="h-10 w-10 text-violet-400" />
          <h1 className="mt-5 text-3xl font-bold">Crie uma nova senha</h1>
          <form onSubmit={(event) => void salvarNovaSenha(event)} className="mt-8 grid gap-4">
            <CamposSenha
              senha={senha}
              confirmacao={confirmacao}
              onSenha={setSenha}
              onConfirmacao={setConfirmacao}
            />
            <BotaoEnviar enviando={enviando} rotuloEnviando="Salvando…">
              Salvar nova senha
            </BotaoEnviar>
          </form>
        </>
      );

    const cadastrando = modo === "cadastrar";
    return (
      <>
        <p className="eyebrow">Bem-vindo</p>
        <h1 className="mt-3 text-3xl font-bold">
          {cadastrando ? "Crie sua página" : "Entre na sua conta"}
        </h1>
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-slate-800 p-1">
          {(["entrar", "cadastrar"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => trocarModo(opcao)}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                modo === opcao
                  ? "bg-violet-500/20 text-violet-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {opcao === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {cadastrando ? (
          <form onSubmit={(event) => void cadastrar(event)} className="mt-6 grid gap-4">
            <Campo rotulo="Nome de usuário" dica="Também será o endereço da sua página.">
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-500">/</span>
                <Input
                  autoComplete="username"
                  value={usuario}
                  maxLength={30}
                  placeholder="seunome"
                  required
                  className="h-12 rounded-xl pl-7"
                  onChange={(event) =>
                    setUsuario(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                />
              </div>
            </Campo>
            {campoEmail}
            <CamposSenha
              senha={senha}
              confirmacao={confirmacao}
              onSenha={setSenha}
              onConfirmacao={setConfirmacao}
            />
            <BotaoEnviar enviando={enviando} rotuloEnviando="Criando conta…">
              Criar conta
            </BotaoEnviar>
          </form>
        ) : (
          <form onSubmit={(event) => void entrar(event)} className="mt-6 grid gap-4">
            {campoEmail}
            <Campo rotulo="Senha">
              <Input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Sua senha"
                required
                className="h-12 rounded-xl"
              />
            </Campo>
            <button
              type="button"
              onClick={() => trocarModo("esqueci")}
              className="-mt-2 justify-self-end text-sm text-violet-300 hover:underline"
            >
              Esqueci minha senha
            </button>
            <BotaoEnviar enviando={enviando} rotuloEnviando="Entrando…">
              Entrar
            </BotaoEnviar>
          </form>
        )}

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
    );
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
        {conteudo()}
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

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {rotulo}
      {children}
      {dica && <span className="text-xs font-normal text-slate-500">{dica}</span>}
    </label>
  );
}

function CamposSenha(props: {
  senha: string;
  confirmacao: string;
  onSenha: (valor: string) => void;
  onConfirmacao: (valor: string) => void;
}) {
  return (
    <>
      <Campo rotulo="Senha" dica="Mínimo de 8 caracteres, com letras e números.">
        <Input
          type="password"
          autoComplete="new-password"
          value={props.senha}
          onChange={(event) => props.onSenha(event.target.value)}
          placeholder="Crie uma senha"
          required
          className="h-12 rounded-xl"
        />
      </Campo>
      <Campo rotulo="Confirmar senha">
        <Input
          type="password"
          autoComplete="new-password"
          value={props.confirmacao}
          onChange={(event) => props.onConfirmacao(event.target.value)}
          placeholder="Repita a senha"
          required
          className="h-12 rounded-xl"
        />
      </Campo>
    </>
  );
}

function BotaoEnviar({
  enviando,
  rotuloEnviando,
  children,
}: {
  enviando: boolean;
  rotuloEnviando: string;
  children: ReactNode;
}) {
  return (
    <Button type="submit" variant="gradient" disabled={enviando} className="h-12 rounded-xl">
      {enviando ? (
        rotuloEnviando
      ) : (
        <>
          {children}
          <ArrowRight />
        </>
      )}
    </Button>
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

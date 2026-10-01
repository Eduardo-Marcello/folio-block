import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { buscarMeuPerfil, ehErroDuplicado } from "@/lib/folio-api";
import { perfilFormSchema, type Perfil } from "@/lib/folio-types";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Escolha seu endereço — NoCode Folio" },
      { name: "description", content: "Defina o endereço da sua página NoCode Folio." },
      { property: "og:title", content: "Escolha seu endereço — NoCode Folio" },
      { property: "og:description", content: "Defina o endereço da sua página NoCode Folio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [slug, setSlug] = useState("");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // O trigger `ao_criar_usuario` já criou a linha em perfis com um slug sugerido.
    buscarMeuPerfil(user.id)
      .then((existente) => {
        setPerfil(existente);
        setSlug(existente?.slug ?? "");
        setNome(
          existente?.nome_completo ||
            String(user.user_metadata?.["full_name"] ?? user.user_metadata?.["name"] ?? ""),
        );
      })
      .catch(() => toast.error("Não foi possível carregar seu perfil"))
      .finally(() => setCarregando(false));
  }, [user]);

  async function concluir(event: FormEvent) {
    event.preventDefault();
    const parsed = perfilFormSchema
      .pick({ slug: true, nome_completo: true })
      .safeParse({ slug, nome_completo: nome });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Confira os campos");
      return;
    }
    setSalvando(true);
    try {
      let perfilId = perfil?.id;
      if (perfil) {
        const { error } = await supabase.from("perfis").update(parsed.data).eq("id", perfil.id);
        if (error) throw error;
      } else {
        // Fallback caso o trigger não exista: a RLS só permite criar para o próprio usuário.
        const { data, error } = await supabase
          .from("perfis")
          .insert({ ...parsed.data, usuario_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        perfilId = data.id;
      }

      const { count } = await supabase
        .from("blocos")
        .select("id", { count: "exact", head: true })
        .eq("perfil_id", perfilId!);
      if (!count) {
        await supabase.from("blocos").insert({
          perfil_id: perfilId!,
          tipo: "texto",
          titulo: "Olá!",
          conteudo: {
            texto: "Bem-vindo à minha página. Em breve, novos blocos por aqui ✨",
            tipo_copia: false,
          },
          colunas: 2,
          linhas: 1,
          ordem: 0,
        });
      }

      // Metadado apenas de UX (não usado para autorização).
      await supabase.auth.updateUser({ data: { onboarding_concluido: true } });
      toast.success("Sua página está pronta!");
      await navigate({ to: "/$slug", params: { slug: parsed.data.slug }, replace: true });
    } catch (erro) {
      toast.error(
        ehErroDuplicado(erro)
          ? "Este endereço já está em uso. Escolha outro."
          : "Não foi possível salvar",
      );
      setSalvando(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">
          <Sparkles />
        </div>
        <p className="eyebrow mt-6">Último passo</p>
        <h1 className="mt-3 text-3xl font-bold">Escolha seu endereço</h1>
        <p className="mt-3 text-slate-400">É por ele que as pessoas vão encontrar sua página.</p>
        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : (
          <form onSubmit={(event) => void concluir(event)} className="mt-8 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold">
              Nome
              <Input
                value={nome}
                maxLength={80}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Seu nome"
                className="h-12 rounded-xl"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Endereço
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-500">/</span>
                <Input
                  autoFocus
                  value={slug}
                  maxLength={30}
                  placeholder="seunome"
                  className="h-12 rounded-xl pl-7"
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                />
              </div>
            </label>
            <Button
              type="submit"
              variant="gradient"
              className="h-12 rounded-xl"
              disabled={salvando}
            >
              {salvando ? (
                "Criando…"
              ) : (
                <>
                  Criar minha página
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

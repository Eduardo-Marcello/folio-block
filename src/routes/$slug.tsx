import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Blocks, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolioGrid } from "@/components/folio/folio-grid";
import { PerfilHeader } from "@/components/folio/perfil-header";
import { usePerfilPorSlug } from "@/lib/folio-api";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.slug} — NoCode Folio` },
      {
        name: "description",
        content: `Links, projetos e novidades de @${params.slug} no NoCode Folio.`,
      },
      { property: "og:title", content: `@${params.slug} — NoCode Folio` },
      { property: "og:description", content: `Conheça a página de @${params.slug}.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerfilPublico,
});

function PerfilPublico() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: perfil, isLoading, isError } = usePerfilPorSlug(slug);

  if (isLoading) return <PerfilSkeleton />;

  if (isError || !perfil) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="eyebrow justify-center">404 · Página não encontrada</p>
          <h1 className="mt-4 text-4xl font-bold">Este endereço ainda está vazio.</h1>
          <p className="mt-3 text-slate-400">
            O usuário pode ter mudado o endereço, ou ele ainda está disponível.
          </p>
          <Button asChild variant="gradient" className="mt-7 rounded-xl">
            <Link to="/">Voltar ao NoCode Folio</Link>
          </Button>
        </div>
      </main>
    );
  }

  // Nota: isso é apenas visual (mostra os controles). A RLS do Supabase bloqueia escrita de quem não é dono.
  const ehDono = user?.id === perfil.usuario_id;

  async function sair() {
    await supabase.auth.signOut();
    await navigate({ to: "/auth" });
  }

  return (
    <main className="min-h-screen px-4 pb-28 pt-4 md:px-8 md:pt-6">
      <header className="mx-auto mb-8 flex min-h-14 max-w-5xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold">
          <Blocks className="h-5 w-5 text-violet-400" />
          NoCode Folio
        </Link>
        {ehDono && (
          <Button size="sm" variant="ghost" onClick={() => void sair()}>
            <LogOut />
            Sair
          </Button>
        )}
      </header>
      <PerfilHeader perfil={perfil} />
      <FolioGrid perfil={perfil} podeEditar={ehDono} />
      <footer className="mx-auto mt-12 flex max-w-5xl items-center justify-between border-t border-slate-800 px-1 py-8 text-xs text-slate-500">
        <span>Feito com NoCode Folio</span>
        {!user && (
          <Link to="/auth" className="text-violet-300 hover:text-violet-200">
            Crie o seu
          </Link>
        )}
      </footer>
    </main>
  );
}

function PerfilSkeleton() {
  return (
    <main className="min-h-screen px-4 pt-20 md:px-8">
      <div className="mx-auto mb-8 flex max-w-5xl items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-[30%]" />
        <div className="grid gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="folio-grid">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton
            key={item}
            className="min-h-[180px] rounded-3xl border border-slate-800 bg-slate-900/40"
          />
        ))}
      </div>
    </main>
  );
}

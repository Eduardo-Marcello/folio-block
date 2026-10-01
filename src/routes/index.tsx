import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Blocks, GripVertical, Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import demoAvatar from "@/assets/demo-avatar.jpg";
import demoShowcase from "@/assets/demo-showcase.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NoCode Folio — Sua internet, organizada em blocos" },
      { name: "description", content: "Crie seu link-in-bio modular com blocos em Bento Grid." },
      { property: "og:title", content: "NoCode Folio — Sua internet, organizada em blocos" },
      {
        property: "og:description",
        content: "Crie seu link-in-bio modular com blocos em Bento Grid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
function Landing() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="brand-mark small">
            <Blocks />
          </span>
          NoCode Folio
        </Link>
        <Button asChild variant="gradient" className="rounded-xl">
          <Link to="/auth">
            Criar meu Folio
            <ArrowRight />
          </Link>
        </Button>
      </nav>
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles />O link na bio, reinventado
          </p>
          <h1>
            Sua internet,
            <br />
            <span>organizada em blocos.</span>
          </h1>
          <p className="hero-subtitle">
            Uma página modular para seus links, projetos, vídeos e tudo o que você está construindo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gradient" className="rounded-xl">
              <Link to="/auth">
                Criar meu Folio
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Layers3 className="text-primary" />
              Blocos modulares
            </span>
            <span className="flex items-center gap-2">
              <GripVertical className="text-primary" />
              Arraste para organizar
            </span>
          </div>
        </div>
        <div className="hero-bento" aria-hidden="true">
          <article className="preview-profile">
            <img src={demoAvatar} alt="" width={1024} height={1024} />
            <div>
              <p>Criadora independente</p>
              <h2>Maya Chen</h2>
              <span>Bubble</span>
              <span>Framer</span>
            </div>
          </article>
          <article className="preview-social">in</article>
          <article className="preview-showcase">
            <img src={demoShowcase} alt="" width={1536} height={864} />
            <div>
              <strong>Luma</strong>
              <span>Workspace criativo</span>
            </div>
          </article>
          <article className="preview-note">
            <span className="text-primary">✦</span>
            <strong>Notas sobre criar</strong>
            <span>Duas vezes por mês.</span>
          </article>
        </div>
      </section>
      <footer className="landing-footer">
        <span>Feito para quem cria.</span>
        <span>© 2026 NoCode Folio</span>
      </footer>
    </main>
  );
}

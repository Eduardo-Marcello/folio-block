import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Blocks, GripVertical, Layers3, MoveUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import demoAvatar from "@/assets/demo-avatar.jpg";
import demoShowcase from "@/assets/demo-showcase.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "NoCode Folio — Your internet, arranged beautifully" },
    { name: "description", content: "Create a modular link-in-bio and portfolio with beautiful Bento Grid blocks." },
    { property: "og:title", content: "NoCode Folio — Your internet, arranged beautifully" },
    { property: "og:description", content: "Create a modular link-in-bio and portfolio with beautiful Bento Grid blocks." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Landing,
});
function Landing() { return <main className="landing-page"><nav className="landing-nav"><Link to="/" className="flex items-center gap-2 font-bold"><span className="brand-mark small"><Blocks /></span>NoCode Folio</Link><div className="flex items-center gap-2"><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/$username" params={{ username: "maya" }}>View demo</Link></Button><Button asChild className="rounded-xl"><Link to="/auth">Create your Folio<ArrowRight /></Link></Button></div></nav><section className="landing-hero"><div className="hero-copy"><p className="eyebrow"><Sparkles />The link in bio, reimagined</p><h1>Your internet,<br /><span>arranged beautifully.</span></h1><p className="hero-subtitle">A modular home for your work, links, ideas, and everything you’re becoming.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="rounded-xl"><Link to="/auth">Create your Folio<ArrowRight /></Link></Button><Button asChild size="lg" variant="outline" className="rounded-xl"><Link to="/$username" params={{ username: "maya" }}>Explore Maya’s folio<MoveUpRight /></Link></Button></div><div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Layers3 className="text-primary" />Modular blocks</span><span className="flex items-center gap-2"><GripVertical className="text-primary" />Drag to arrange</span></div></div><Link to="/$username" params={{ username: "maya" }} className="hero-bento" aria-label="Open Maya’s demo folio"><article className="preview-profile"><img src={demoAvatar} alt="Maya Chen" width={1024} height={1024} /><div><p>Independent maker</p><h2>Maya Chen</h2><span>Bubble</span><span>Framer</span></div></article><article className="preview-social">in</article><article className="preview-showcase"><img src={demoShowcase} alt="Creative product workspace" width={1536} height={864} /><div><strong>Luma</strong><span>Creative workspace</span></div></article><article className="preview-note"><MailIcon /><strong>Notes on making</strong><span>Twice a month.</span></article></Link></section><footer className="landing-footer"><span>Built for people who make things.</span><span>© 2026 NoCode Folio</span></footer></main>; }
function MailIcon() { return <span className="text-primary">✦</span>; }

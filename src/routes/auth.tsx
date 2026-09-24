import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Blocks, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — NoCode Folio" },
    { name: "description", content: "Create or manage your modular NoCode Folio profile." },
    { property: "og:title", content: "Sign in — NoCode Folio" },
    { property: "og:description", content: "Create or manage your modular NoCode Folio profile." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate(); const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [fullName, setFullName] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) void goNext(data.user.id); }); }, []);
  async function goNext(id: string) { const { data } = await supabase.from("profiles").select("username").eq("id", id).maybeSingle(); if (data) await navigate({ to: "/$username", params: { username: data.username } }); else await navigate({ to: "/onboarding" }); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    if (mode === "forgot") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); setSaving(false); if (error) { toast.error(error.message); return; } toast.success("Check your email for a reset link"); return; }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } } }); setSaving(false);
      if (error) { toast.error(error.message); return; } if (!data.session) { toast.success("Check your email to confirm your account"); return; } if (data.user) await goNext(data.user.id); return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password }); setSaving(false); if (error) { toast.error("Email or password is incorrect"); return; } await goNext(data.user.id);
  }
  return <main className="auth-page"><section className="auth-card"><a href="/" className="mb-10 flex items-center gap-2 font-bold"><span className="brand-mark small"><Blocks /></span>NoCode Folio</a><p className="eyebrow">{mode === "signup" ? "Start creating" : mode === "forgot" ? "Password recovery" : "Welcome back"}</p><h1 className="mt-3 text-3xl font-bold">{mode === "signup" ? "Build your folio" : mode === "forgot" ? "Reset your password" : "Your work, your way"}</h1><p className="mt-3 text-muted-foreground">{mode === "forgot" ? "We’ll send a secure reset link to your inbox." : "A flexible home for everything you make."}</p><form onSubmit={submit} className="mt-8 grid gap-4">{mode === "signup" && <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" required className="h-12 rounded-xl" />}<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" required className="h-12 rounded-xl" />{mode !== "forgot" && <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="Password" required className="h-12 rounded-xl" />}<Button disabled={saving} className="h-12 rounded-xl">{saving ? "Please wait…" : <>{mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}<ArrowRight /></>}</Button></form>{mode === "login" && <button className="mt-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>}<div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">{mode === "signup" ? "Already have a folio? " : "New here? "}<button className="font-semibold text-primary" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Sign in" : "Create an account"}</button></div>{mode === "forgot" && <button className="mt-5 flex items-center gap-2 text-sm text-primary" onClick={() => setMode("login")}><Mail />Back to sign in</button>}</section><div className="auth-aside" aria-hidden="true"><Sparkles /><p>Arrange your internet<br />like it belongs to you.</p></div></main>;
}

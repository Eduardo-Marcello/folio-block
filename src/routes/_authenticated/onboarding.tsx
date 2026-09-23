import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStarterProfile } from "@/lib/profile-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [
    { title: "Choose your username — NoCode Folio" },
    { name: "description", content: "Claim your unique NoCode Folio username." },
    { property: "og:title", content: "Choose your username — NoCode Folio" },
    { property: "og:description", content: "Claim your unique NoCode Folio username." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState(String(user.user_metadata?.full_name ?? ""));
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = z.string().regex(/^[a-z0-9_]{3,24}$/).safeParse(username);
    if (!parsed.success) return toast.error("Use 3–24 lowercase letters, numbers, or underscores");
    setSaving(true);
    const { data: existing } = await supabase.from("profiles").select("id").eq("username", parsed.data).maybeSingle();
    if (existing) { setSaving(false); return toast.error("That username is already taken"); }
    try {
      await createStarterProfile(user.id, parsed.data, fullName.trim() || "New creator");
      toast.success("Your folio is ready");
      await navigate({ to: "/$username", params: { username: parsed.data } });
    } catch { toast.error("Couldn’t create your folio"); setSaving(false); }
  }
  return <main className="auth-page"><section className="auth-card"><div className="brand-mark"><Sparkles /></div><p className="eyebrow">One last step</p><h1 className="mt-3 text-3xl font-bold">Claim your corner</h1><p className="mt-3 text-muted-foreground">Choose the name people will use to find your folio.</p><form onSubmit={submit} className="mt-8 grid gap-5"><label className="grid gap-2 text-sm font-semibold">Full name<Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" className="h-12 rounded-xl" /></label><label className="grid gap-2 text-sm font-semibold">Username<div className="relative"><span className="absolute left-3 top-3.5 text-muted-foreground">/</span><Input autoFocus value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="yourname" className="h-12 rounded-xl pl-7" /></div></label><Button className="h-12 rounded-xl" disabled={saving}>{saving ? "Creating…" : <>Create my folio<ArrowRight /></>}</Button></form></section></main>;
}

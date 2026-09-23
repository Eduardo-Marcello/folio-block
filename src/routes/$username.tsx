import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Blocks, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolioGrid } from "@/components/folio/folio-grid";
import { getProfileByUsername } from "@/lib/profile-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/$username")({
  head: ({ params }) => ({ meta: [
    { title: `@${params.username} — NoCode Folio` },
    { name: "description", content: `Explore @${params.username}'s links, work, and updates on NoCode Folio.` },
    { property: "og:title", content: `@${params.username} — NoCode Folio` },
    { property: "og:description", content: `Explore @${params.username}'s modular profile.` },
    { property: "og:type", content: "profile" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: PublicProfile,
});

function PublicProfile() {
  const { username } = Route.useParams(); const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["folio", username], queryFn: () => getProfileByUsername(username) });
  if (isLoading) return <ProfileSkeleton />;
  if (!data) return <main className="profile-page flex min-h-screen items-center justify-center px-6 text-center"><div><p className="eyebrow">404 · Folio not found</p><h1 className="mt-4 text-4xl font-bold">This corner is still empty.</h1><p className="mt-3 text-muted-foreground">The username may have changed, or it’s waiting to be claimed.</p><Button asChild className="mt-7 rounded-xl"><Link to="/">Back to NoCode Folio</Link></Button></div></main>;
  const isOwner = user?.id === data.profile.id;
  return <main className="profile-page"><header className="profile-header"><Link to="/" className="flex items-center gap-2 text-sm font-bold"><Blocks className="text-primary" />NoCode Folio</Link><div className="flex items-center gap-2"><span className="hidden text-sm text-muted-foreground sm:inline">@{data.profile.username}</span>{isOwner && <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}><LogOut />Sign out</Button>}</div></header><FolioGrid profile={data.profile} initialWidgets={data.widgets} canEdit={isOwner} /><footer className="mx-auto mt-12 flex max-w-5xl items-center justify-between border-t border-border px-1 py-8 text-xs text-muted-foreground"><span>Made with NoCode Folio</span><span>Arrange your internet.</span></footer></main>;
}
function ProfileSkeleton() { return <main className="profile-page"><div className="profile-header"><Skeleton className="h-8 w-36" /></div><div className="folio-grid">{[0,1,2,3,4].map((item) => <Skeleton key={item} className="min-h-44 rounded-3xl border border-border bg-card md:min-h-0" />)}</div></main>; }

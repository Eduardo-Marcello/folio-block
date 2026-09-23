import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown, ArrowUp, AtSign, Edit3, Github, GripVertical, Instagram, Linkedin,
  MapPin, Music2, Plus, Trash2, Twitter, Youtube, ExternalLink, Mail, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Profile, WidgetContent, WidgetRow, WidgetSize, WidgetType } from "@/lib/folio-types";
import { widgetContent, widgetLabels } from "@/lib/folio-types";
import demoAvatar from "@/assets/demo-avatar.jpg";
import demoShowcase from "@/assets/demo-showcase.jpg";

type Props = { profile: Profile; initialWidgets: WidgetRow[]; canEdit?: boolean };

const socialIcons = { instagram: Instagram, linkedin: Linkedin, github: Github, youtube: Youtube, x: Twitter, tiktok: Music2 };
const sizeClass: Record<WidgetSize, string> = {
  "1x1": "md:col-span-1 md:row-span-1",
  "2x1": "md:col-span-2 md:row-span-1",
  "2x2": "md:col-span-2 md:row-span-2",
};

export function FolioGrid({ profile, initialWidgets, canEdit = false }: Props) {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; widget?: WidgetRow } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function persistOrder(next: WidgetRow[]) {
    setWidgets(next);
    const results = await Promise.all(next.map((widget, index) => supabase.from("widgets").update({ position_index: index }).eq("id", widget.id)));
    if (results.some(({ error }) => error)) toast.error("Couldn’t save the new order");
  }

  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = widgets.findIndex((item) => item.id === event.active.id);
    const newIndex = widgets.findIndex((item) => item.id === event.over?.id);
    if (oldIndex >= 0 && newIndex >= 0) void persistOrder(arrayMove(widgets, oldIndex, newIndex));
  }

  async function remove(widget: WidgetRow) {
    if (widget.type === "profile") return toast.error("Your profile block can’t be deleted");
    const { error } = await supabase.from("widgets").delete().eq("id", widget.id);
    if (error) return toast.error("Couldn’t delete this block");
    await persistOrder(widgets.filter((item) => item.id !== widget.id));
    toast.success("Block removed");
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= widgets.length) return;
    void persistOrder(arrayMove(widgets, index, nextIndex));
  }

  function upsert(saved: WidgetRow) {
    setWidgets((current) => {
      const exists = current.some((item) => item.id === saved.id);
      return exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved];
    });
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
          <div className="folio-grid">
            {widgets.map((widget, index) => (
              <SortableBlock key={widget.id} widget={widget} profile={profile} index={index} editing={editing}
                onEdit={() => setModal({ mode: "edit", widget })} onDelete={() => void remove(widget)}
                onMoveUp={() => move(index, -1)} onMoveDown={() => move(index, 1)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {canEdit && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl border border-border bg-popover/90 p-2 shadow-2xl backdrop-blur-xl">
          {editing && <Button variant="secondary" className="rounded-xl" onClick={() => setModal({ mode: "add" })}><Plus />Add block</Button>}
          <Button className="rounded-xl" onClick={() => setEditing((value) => !value)}>{editing ? "Done" : <><Edit3 />Edit profile</>}</Button>
        </div>
      )}
      <BlockDialog open={Boolean(modal)} mode={modal?.mode ?? "add"} widget={modal?.widget} profile={profile}
        onOpenChange={(open) => { if (!open) setModal(null); }} onSaved={upsert} />
    </>
  );
}

function SortableBlock({ widget, profile, index, editing, onEdit, onDelete, onMoveUp, onMoveDown }: {
  widget: WidgetRow; profile: Profile; index: number; editing: boolean; onEdit: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const reduced = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id, disabled: !editing });
  return (
    <motion.article ref={setNodeRef} layout initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.06, duration: 0.42 }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("folio-block group", sizeClass[widget.size], editing ? "is-editing" : "is-viewing", isDragging && "z-30 opacity-80")}>
      {editing && (
        <div className="absolute right-3 top-3 z-30 flex gap-1 rounded-xl border border-border bg-popover/90 p-1 shadow-xl">
          <Button size="icon" variant="ghost" aria-label="Move block up" onClick={onMoveUp}><ArrowUp /></Button>
          <Button size="icon" variant="ghost" aria-label="Move block down" onClick={onMoveDown}><ArrowDown /></Button>
          <Button size="icon" variant="ghost" aria-label="Edit block" onClick={onEdit}><Edit3 /></Button>
          {widget.type !== "profile" && <Button size="icon" variant="ghost" aria-label="Delete block" onClick={onDelete}><Trash2 /></Button>}
          <Button size="icon" variant="ghost" aria-label="Drag block" className="cursor-grab touch-none" {...attributes} {...listeners}><GripVertical /></Button>
        </div>
      )}
      <WidgetView widget={widget} profile={profile} editing={editing} />
    </motion.article>
  );
}

function WidgetView({ widget, profile, editing }: { widget: WidgetRow; profile: Profile; editing: boolean }) {
  const content = widgetContent(widget.content);
  if (widget.type === "profile") {
    const avatar = profile.username === "maya" ? demoAvatar : profile.avatar_url;
    return <div className="flex h-full flex-col justify-between p-7 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <img src={avatar || `https://api.dicebear.com/9.x/shapes/svg?seed=${profile.username}`} alt={`${profile.full_name} avatar`} width={112} height={112} className="h-24 w-24 rounded-[30%] object-cover ring-1 ring-border md:h-28 md:w-28" />
        <span className="status-pill"><span />{String(content.availability || "Available")}</span>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-primary">{String(content.eyebrow || "Creator")}</p>
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">{profile.full_name}</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground md:text-base">{profile.bio}</p>
        <div className="mt-5 flex flex-wrap gap-2">{profile.skills.map((skill) => <span className="skill-pill" key={skill}>{skill}</span>)}</div>
      </div>
    </div>;
  }
  if (widget.type === "social") {
    const Icon = socialIcons[String(content.platform || "x").toLowerCase() as keyof typeof socialIcons] ?? AtSign;
    const inner = <div className="flex h-full flex-col items-center justify-center gap-4 p-6"><Icon className="h-12 w-12 text-primary" strokeWidth={1.5} /><div className="text-center"><p className="font-semibold text-foreground">{String(content.label || content.platform || "Social")}</p><p className="mt-1 text-xs text-muted-foreground">Connect with me</p></div><ExternalLink className="absolute right-5 top-5 h-4 w-4 text-muted-foreground" /></div>;
    return editing ? inner : <a className="absolute inset-0" href={String(content.url || "#")} target="_blank" rel="noreferrer" aria-label={`Open ${String(content.label || "social link")}`}>{inner}</a>;
  }
  if (widget.type === "showcase") {
    const image = profile.username === "maya" ? demoShowcase : String(content.image_url || demoShowcase);
    const inner = <><img src={image} alt="" width={1536} height={864} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" /><div className="absolute inset-x-0 bottom-0 z-10 p-6"><p className="text-xl font-bold text-foreground">{String(content.title || "Featured work")}</p><p className="mt-1 text-sm text-muted-foreground">{String(content.subtitle || "View project")}</p></div></>;
    return editing ? inner : <a className="absolute inset-0" href={String(content.url || "#")} target="_blank" rel="noreferrer" aria-label={`Open ${String(content.title || "showcase")}`}>{inner}</a>;
  }
  if (widget.type === "newsletter") return <Newsletter profileId={profile.id} content={content} disabled={editing} />;
  return <div className="relative h-full overflow-hidden p-6"><MapArtwork /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background p-6 pt-12"><p className="text-xs font-semibold uppercase text-primary">{String(content.label || "Working from")}</p><p className="mt-1 font-bold text-foreground">{String(content.city || "Somewhere great")}</p></div></div>;
}

function Newsletter({ profileId, content, disabled }: { profileId: string; content: WidgetContent; disabled: boolean }) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) return toast.error("Enter a valid email address");
    setSaving(true);
    const { error } = await supabase.from("subscribers").insert({ profile_id: profileId, email: parsed.data.toLowerCase() });
    setSaving(false);
    if (error?.code === "23505") return toast.info("You’re already on the list");
    if (error) return toast.error("Couldn’t subscribe right now");
    setEmail(""); toast.success("You’re on the list!");
  }
  return <div className="flex h-full flex-col justify-center p-6 md:p-8"><Mail className="mb-4 h-7 w-7 text-primary" /><h2 className="max-w-lg text-xl font-bold text-foreground md:text-2xl">{String(content.headline || "Stay in the loop")}</h2><p className="mt-2 text-sm text-muted-foreground">{String(content.description || "Occasional notes, always useful.")}</p><form onSubmit={submit} className="mt-5 flex gap-2"><Input aria-label="Email address" type="email" placeholder="you@email.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={disabled} className="h-11 rounded-xl bg-input/50" /><Button disabled={saving || disabled} className="h-11 rounded-xl">{saving ? "Joining…" : "Subscribe"}</Button></form></div>;
}

function MapArtwork() {
  return <div className="map-art" aria-hidden="true"><span className="road road-a" /><span className="road road-b" /><span className="road road-c" /><span className="road road-d" /><span className="map-pin"><MapPin /></span></div>;
}

function BlockDialog({ open, mode, widget, profile, onOpenChange, onSaved }: { open: boolean; mode: "add" | "edit"; widget?: WidgetRow; profile: Profile; onOpenChange: (open: boolean) => void; onSaved: (widget: WidgetRow) => void }) {
  const initial = useMemo(() => widgetContent(widget?.content ?? {}), [widget]);
  const [type, setType] = useState<WidgetType>(widget?.type ?? "social");
  const [size, setSize] = useState<WidgetSize>(widget?.size ?? "1x1");
  const [content, setContent] = useState<WidgetContent>(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setType(widget?.type ?? "social"); setSize(widget?.size ?? "1x1"); setContent(widgetContent(widget?.content ?? {})); }, [widget, open]);
  const field = (key: string, label: string, placeholder: string, typeValue = "text") => <label className="grid gap-2 text-sm font-medium text-foreground">{label}<Input type={typeValue} value={String(content[key] ?? "")} placeholder={placeholder} onChange={(event) => setContent((current) => ({ ...current, [key]: event.target.value }))} /></label>;
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    if (widget) {
      const { data, error } = await supabase.from("widgets").update({ type, size, content }).eq("id", widget.id).select().single();
      setSaving(false); if (error) return toast.error("Couldn’t save this block"); onSaved(data); toast.success("Block updated");
    } else {
      const { count } = await supabase.from("widgets").select("id", { count: "exact", head: true }).eq("profile_id", profile.id);
      const { data, error } = await supabase.from("widgets").insert({ profile_id: profile.id, type, size, content, position_index: count ?? 0 }).select().single();
      setSaving(false); if (error) return toast.error("Couldn’t add this block"); onSaved(data); toast.success("Block added");
    }
    onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[88vh] overflow-y-auto rounded-2xl border-border bg-popover"><DialogHeader><DialogTitle>{mode === "add" ? "Add a block" : `Edit ${widgetLabels[type]}`}</DialogTitle><DialogDescription>Shape this block to fit your folio.</DialogDescription></DialogHeader><form onSubmit={save} className="grid gap-5">
    {mode === "add" && <div className="grid grid-cols-2 gap-2">{(Object.keys(widgetLabels) as WidgetType[]).filter((value) => value !== "profile").map((value) => <Button key={value} type="button" variant={type === value ? "default" : "outline"} onClick={() => setType(value)} className="justify-start rounded-xl">{widgetLabels[value]}</Button>)}</div>}
    <div><p className="mb-2 text-sm font-medium">Size</p><div className="flex gap-2">{(["1x1", "2x1", "2x2"] as WidgetSize[]).map((value) => <Button key={value} type="button" size="sm" variant={size === value ? "default" : "outline"} onClick={() => setSize(value)}>{value}</Button>)}</div></div>
    {type === "social" && <>{field("platform", "Platform", "instagram")}{field("label", "Label", "Instagram")}{field("url", "Link", "https://...")}</>}
    {type === "showcase" && <>{field("title", "Title", "Project name")}{field("subtitle", "Subtitle", "Design · 2026")}{field("url", "Project link", "https://...")}{field("image_url", "Cover image URL", "https://...")}</>}
    {type === "newsletter" && <>{field("headline", "Headline", "Follow what I’m building")}{field("description", "Description", "A short letter, twice a month.")}</>}
    {type === "map" && <>{field("city", "City", "Brooklyn, NY")}{field("label", "Small label", "Working from")}</>}
    {type === "profile" && <><label className="grid gap-2 text-sm font-medium">Full name<Input value={profile.full_name} disabled /></label>{field("eyebrow", "Eyebrow", "Independent maker")}{field("availability", "Status", "Available for projects")}</>}
    <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} type="submit"><Sparkles />{saving ? "Saving…" : "Save block"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

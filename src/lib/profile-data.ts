import { supabase } from "@/integrations/supabase/client";
import type { Profile, WidgetRow, WidgetType, WidgetSize, WidgetContent } from "./folio-types";

export async function getProfileByUsername(username: string) {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const { data: widgets, error: widgetsError } = await supabase.from("widgets").select("*").eq("profile_id", profile.id).order("position_index");
  if (widgetsError) throw widgetsError;
  return { profile: profile as Profile, widgets: (widgets ?? []) as WidgetRow[] };
}

export async function createStarterProfile(userId: string, username: string, fullName: string) {
  const { error } = await supabase.from("profiles").insert({ id: userId, username, full_name: fullName, bio: "Building useful things without the usual limits.", skills: ["No-code", "Design"] });
  if (error) throw error;
  const starters: Array<{ profile_id: string; type: WidgetType; size: WidgetSize; content: WidgetContent; position_index: number }> = [
    { profile_id: userId, type: "profile", size: "2x2", content: { eyebrow: "Independent creator", availability: "Open to collaborations" }, position_index: 0 },
    { profile_id: userId, type: "social", size: "1x1", content: { platform: "linkedin", label: "LinkedIn", url: "https://linkedin.com" }, position_index: 1 },
    { profile_id: userId, type: "newsletter", size: "2x1", content: { headline: "Follow what I’m building", description: "Occasional notes, no noise." }, position_index: 2 },
  ];
  const { error: widgetError } = await supabase.from("widgets").insert(starters);
  if (widgetError) throw widgetError;
}

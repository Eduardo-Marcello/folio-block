import type { Json, Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type WidgetRow = Tables<"widgets">;
export type WidgetType = WidgetRow["type"];
export type WidgetSize = WidgetRow["size"];
export type WidgetContent = Record<string, string | number | boolean | string[] | null>;

export function widgetContent(value: Json): WidgetContent {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as WidgetContent)
    : {};
}

export const widgetLabels: Record<WidgetType, string> = {
  profile: "Profile",
  social: "Social link",
  showcase: "Showcase",
  newsletter: "Newsletter",
  map: "Location",
};

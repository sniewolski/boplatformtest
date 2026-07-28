import type { ToolComponentProps } from "@/tools/registry";
import { DailyLogCalendar } from "./Calendar";

/**
 * In-tool router for Daily Log. Mirrors the salescode splat dispatch.
 * This phase renders the calendar for every segment; later phases add routing.
 */
export function DailyLogApp({ splat }: ToolComponentProps) {
  void (splat || "").split("/")[0];
  return <DailyLogCalendar />;
}

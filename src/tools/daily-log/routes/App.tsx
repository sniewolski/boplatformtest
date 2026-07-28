import type { ToolComponentProps } from "@/tools/registry";
import { DailyLogCalendar } from "./Calendar";

/**
 * In-tool router for Daily Log. The first splat segment may be "today" or a
 * 'YYYY-MM-DD' date, which opens that day's dialog on arrival. Anything else
 * renders the plain calendar — never throws.
 */
export function DailyLogApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0];
  return <DailyLogCalendar segment={segment} />;
}

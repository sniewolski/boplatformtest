import { CalendarRange } from "lucide-react";
import type { ToolManifest } from "../registry";
import { DailyLogApp } from "./routes/App";

export const dailyLogManifest: ToolManifest = {
  key: "daily-log",
  name: "Daily Log",
  description: "Track your daily activity.",
  icon: CalendarRange,
  navEntry: {
    label: "Daily Log",
    icon: CalendarRange,
    navGroup: "coaching",
  },
  Component: DailyLogApp,
};

import { PlayCircle } from "lucide-react";
import type { ToolManifest } from "../registry";
import { WatchFirstApp } from "./routes/App";
import { WatchFirstDashboardWidget } from "./components/DashboardWidget";

export const watchFirstManifest: ToolManifest = {
  key: "watch-first",
  name: "Watch First",
  description: "Start here — short onboarding lessons.",
  icon: PlayCircle,
  navEntry: {
    label: "Watch First",
    icon: PlayCircle,
    navGroup: "coaching",
  },
  dashboardWidget: { render: () => <WatchFirstDashboardWidget /> },
  Component: WatchFirstApp,
};

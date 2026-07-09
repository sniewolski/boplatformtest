import { MessagesSquare } from "lucide-react";
import type { ToolManifest } from "../registry";
import { WillAiApp } from "./routes/App";
import { DashboardWidget } from "./components/DashboardWidget";

export const willAiManifest: ToolManifest = {
  key: "will-ai",
  name: "Will AI",
  description: "Ask questions and get answers grounded in the source material.",
  icon: MessagesSquare,
  navEntry: {
    label: "Will AI",
    icon: MessagesSquare,
  },
  dashboardWidget: {
    render: () => <DashboardWidget />,
  },
  Component: WillAiApp,
};

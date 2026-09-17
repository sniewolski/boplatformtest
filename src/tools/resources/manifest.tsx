import { FolderDown } from "lucide-react";
import type { ToolManifest } from "../registry";
import { ResourcesApp } from "./routes/App";
import { DashboardWidget as ResourcesDashboardWidget } from "./components/DashboardWidget";

export const resourcesManifest: ToolManifest = {
  key: "resources",
  name: "Resources",
  description: "Downloadable worksheets, templates and one-pagers by category.",
  icon: FolderDown,
  navEntry: {
    label: "Resources",
    icon: FolderDown,
    navGroup: "resources",
  },
  dashboardWidget: { render: () => <ResourcesDashboardWidget /> },
  Component: ResourcesApp,
};

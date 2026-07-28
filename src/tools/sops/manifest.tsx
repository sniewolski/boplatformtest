import { BookOpen } from "lucide-react";
import type { ToolManifest } from "../registry";
import { SopsApp } from "./routes/App";
import { DashboardWidget as SopsDashboardWidget } from "./components/DashboardWidget";

export const sopsManifest: ToolManifest = {
  key: "sops",
  name: "SOPs",
  description: "Standard operating procedures — shared library of PDFs.",
  icon: BookOpen,
  navEntry: {
    label: "SOPs",
    icon: BookOpen,
    navGroup: "resources",
  },
  dashboardWidget: { render: () => <SopsDashboardWidget /> },
  Component: SopsApp,
};

import { ListChecks } from "lucide-react";
import type { ToolManifest } from "../registry";
import { SalesOperatingSystemAuditApp } from "./routes/App";
import { DashboardWidget } from "./components/DashboardWidget";

export const salesOperatingSystemAuditManifest: ToolManifest = {
  key: "sales-operating-system-audit",
  name: "Sales Operating System Audit",
  description: "How your sales operation runs today, start to finish.",
  icon: ListChecks,
  // Hidden from owners (sidebar, dashboard, direct URL) while the audit is not
  // offered. Code, tables, data and storage stay intact — remove this line to
  // bring it back.
  hidden: true,
  navEntry: {
    label: "Sales Operating System Audit",
    icon: ListChecks,
    navGroup: "coaching",
  },
  dashboardWidget: {
    render: () => <DashboardWidget />,
  },
  Component: SalesOperatingSystemAuditApp,
};


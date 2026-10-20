import { ListChecks } from "lucide-react";
import type { ToolManifest } from "../registry";
import { SalesOperatingSystemAuditApp } from "./routes/App";

export const salesOperatingSystemAuditManifest: ToolManifest = {
  key: "sales-operating-system-audit",
  name: "Sales Operating System Audit",
  description: "A config-driven intake covering every part of your sales operation.",
  icon: ListChecks,
  navEntry: {
    label: "Sales Operating System Audit",
    icon: ListChecks,
    navGroup: "coaching",
  },
  Component: SalesOperatingSystemAuditApp,
};

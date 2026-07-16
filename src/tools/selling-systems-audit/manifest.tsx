import { ClipboardCheck } from "lucide-react";
import type { ToolManifest } from "../registry";
import { SellingSystemsAuditApp } from "./routes/App";
import { DashboardWidget } from "./components/DashboardWidget";

export const sellingSystemsAuditManifest: ToolManifest = {
  key: "selling-systems-audit",
  name: "Selling Systems Audit",
  description:
    "A four-part diagnostic of how your business converts attention into revenue.",
  icon: ClipboardCheck,
  navEntry: {
    label: "Selling Systems Audit",
    icon: ClipboardCheck,
  },
  dashboardWidget: {
    render: () => <DashboardWidget />,
  },
  Component: SellingSystemsAuditApp,
};

import { Fingerprint } from "lucide-react";
import type { ToolManifest } from "../registry";
import { SalesCodeApp } from "./routes/App";
import { DashboardWidget } from "./components/DashboardWidget";

export const salescodeManifest: ToolManifest = {
  key: "salescode",
  name: "SalesCode",
  description:
    "A deterministic self-assessment of how you sell — your four-letter type and trait profile.",
  icon: Fingerprint,
  navEntry: {
    label: "SalesCode",
    icon: Fingerprint,
    navGroup: "coaching",
  },
  dashboardWidget: {
    render: () => <DashboardWidget />,
  },
  Component: SalesCodeApp,
};

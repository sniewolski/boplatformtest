import { Compass } from "lucide-react";
import type { ToolManifest } from "../registry";
import { SalesCodeApp } from "./routes/App";

export const salescodeManifest: ToolManifest = {
  key: "salescode",
  name: "SalesCode",
  description:
    "A deterministic self-assessment of how you sell — your four-letter type and trait profile.",
  icon: Compass,
  navEntry: {
    label: "SalesCode",
    icon: Compass,
  },
  Component: SalesCodeApp,
};

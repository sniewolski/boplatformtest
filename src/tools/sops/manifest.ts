import { FileText } from "lucide-react";
import type { ToolManifest } from "../registry";
import { SopsApp } from "./routes/App";

export const sopsManifest: ToolManifest = {
  key: "sops",
  name: "SOPs",
  description: "Standard operating procedures — shared library of PDFs.",
  icon: FileText,
  navEntry: {
    label: "SOPs",
    icon: FileText,
  },
  Component: SopsApp,
};

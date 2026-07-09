/**
 * Tool registry.
 *
 * The shell composes nav, dashboard widgets, and tool routes from this array.
 * Adding a tool = appending one manifest. Tools never import each other; the
 * ESLint rule in eslint.config.js enforces that, plus the rule that core/*
 * cannot import from tools/*.
 *
 * `Component` is the live mount point: it receives the trailing splat for the
 * `/app/tools/$key/*` route and is responsible for its own internal routing.
 * `appRoutes` / `publicRoutes` remain on the manifest for future file-route
 * mounting but are not required.
 */
import type { ComponentType, ReactNode } from "react";
import type { AnyRoute } from "@tanstack/react-router";

import { sellingSystemsAuditManifest } from "./selling-systems-audit/manifest";
import { salescodeManifest } from "./salescode/manifest";
import { sopsManifest } from "./sops/manifest";
import { willAiManifest } from "./will-ai/manifest";

export type ToolNavEntry = {
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

export type ToolDashboardWidget = {
  render: () => ReactNode;
};

export type ToolComponentProps = {
  /** The trailing path after `/app/tools/<key>/`, with no leading slash. */
  splat: string;
};

export type ToolManifest = {
  key: string;
  name: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  navEntry?: ToolNavEntry;
  dashboardWidget?: ToolDashboardWidget;
  /** The tool's runtime root. Receives the splat and renders its own routes. */
  Component?: ComponentType<ToolComponentProps>;
  appRoutes?: AnyRoute[];
  publicRoutes?: AnyRoute[];
};

export const toolRegistry: ToolManifest[] = [
  sellingSystemsAuditManifest,
  salescodeManifest,
  sopsManifest,
  willAiManifest,
];

/**
 * Tool registry.
 *
 * The shell composes nav, dashboard widgets, and tool routes from this array.
 * Adding a tool = appending one manifest. Tools never import each other; the
 * ESLint rule in eslint.config.js enforces that, plus the rule that core/*
 * cannot import from tools/*.
 *
 * `appRoutes` returns TanStack route children mounted under
 * `/_authenticated/app/tools/$key/$`. `publicRoutes` is for respondent-facing
 * routes the tool wants under `/r/$token/*`. Both are optional — a tool that
 * only contributes a dashboard widget can omit them.
 */
import type { ComponentType, ReactNode } from "react";
import type { AnyRoute } from "@tanstack/react-router";

export type ToolNavEntry = {
  label: string;
  /** Optional lucide-style icon. */
  icon?: ComponentType<{ className?: string }>;
};

export type ToolDashboardWidget = {
  render: () => ReactNode;
};

export type ToolManifest = {
  /** Stable URL slug. Used in /app/tools/:key. */
  key: string;
  /** Human-facing name. */
  name: string;
  /** One-line description for dashboard/admin surfaces. */
  description: string;
  /** Optional icon used in nav + dashboard widget. */
  icon?: ComponentType<{ className?: string }>;
  /** Optional sidebar entry. */
  navEntry?: ToolNavEntry;
  /** Optional dashboard widget. */
  dashboardWidget?: ToolDashboardWidget;
  /** Authenticated routes mounted under /app/tools/:key/* . */
  appRoutes?: AnyRoute[];
  /** Public respondent routes mounted under /r/:token/* . */
  publicRoutes?: AnyRoute[];
};

export const toolRegistry: ToolManifest[] = [];

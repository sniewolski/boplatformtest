/**
 * Tool registry.
 *
 * Phase 3 will define the full ToolManifest contract and the routing/nav
 * composition. For now this is an empty array so the shell can iterate over
 * it without conditionals. ESLint rules in Phase 3 will forbid cross-tool
 * imports and core→tool imports.
 */
import type { ComponentType } from "react";

export type ToolNavEntry = {
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

export type ToolManifest = {
  /** Stable URL slug, used in /app/tools/:key */
  key: string;
  /** Human-facing name. */
  name: string;
  /** One-line description for dashboard/admin surfaces. */
  description: string;
  /** Optional sidebar entry. Omit to hide from nav. */
  navEntry?: ToolNavEntry;
};

export const toolRegistry: ToolManifest[] = [];

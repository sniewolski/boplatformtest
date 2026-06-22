import type { IndustryKey, PeriodKey, StageKey } from "../config";

export type StageVolumes = Record<StageKey, number>;

export type ConversionInputs = {
  industry: IndustryKey | null;
  period: PeriodKey;
  avgDealValue: number | null;
  volumes: Partial<StageVolumes>;
};

export type StageTransition = {
  /** e.g. "leads->qualified" */
  key: "leads->qualified" | "qualified->opportunities" | "opportunities->won";
  fromKey: StageKey;
  toKey: StageKey;
  fromLabel: string;
  toLabel: string;
  currentRate: number | null;
  targetRate: number;
  /** target - currentRate, clamped at 0 if at/above target. */
  gap: number;
  /** Annualised recoverable revenue if this stage hits target, others unchanged. */
  recoverableAnnualRevenue: number;
  isBottleneck: boolean;
};

export type FunnelResult = {
  valid: boolean;
  reason?: "missing-industry" | "missing-deal-value" | "missing-volumes" | "no-leads";
  notes: string[];
  volumes: StageVolumes;
  currentPeriodRevenue: number;
  currentAnnualRevenue: number;
  transitions: StageTransition[];
  /** Ranked by recoverableAnnualRevenue desc; bottlenecks only. */
  rankedBottlenecks: StageTransition[];
};

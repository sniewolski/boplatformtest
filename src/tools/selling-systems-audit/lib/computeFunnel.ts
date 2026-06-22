import {
  KPI_TARGETS,
  PERIODS,
  STAGES,
  type IndustryKey,
} from "../config";
import type { ConversionInputs, FunnelResult, StageTransition, StageVolumes } from "./types";

function annualMultiplier(period: ConversionInputs["period"]): number {
  return PERIODS.find((p) => p.key === period)?.annualMultiplier ?? 1;
}

function safeRate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeFunnel(inputs: ConversionInputs): FunnelResult {
  const notes: string[] = [];

  const volumes: StageVolumes = {
    leads: Number(inputs.volumes.leads ?? NaN),
    qualified: Number(inputs.volumes.qualified ?? NaN),
    opportunities: Number(inputs.volumes.opportunities ?? NaN),
    won: Number(inputs.volumes.won ?? NaN),
  };

  if (!inputs.industry) {
    return emptyResult(volumes, "missing-industry");
  }
  if (!inputs.avgDealValue || inputs.avgDealValue <= 0) {
    return emptyResult(volumes, "missing-deal-value");
  }
  const allVolumesValid = STAGES.every((s) => {
    const v = volumes[s.key];
    return Number.isFinite(v) && v >= 0;
  });
  if (!allVolumesValid) {
    return emptyResult(volumes, "missing-volumes");
  }
  if (volumes.leads <= 0) {
    return emptyResult(volumes, "no-leads");
  }

  // Soft notes for funnel-shape weirdness — do not crash.
  if (volumes.qualified > volumes.leads) {
    notes.push("More qualified leads than total leads — check these numbers.");
  }
  if (volumes.opportunities > volumes.qualified) {
    notes.push("More opportunities than qualified leads — check these numbers.");
  }
  if (volumes.won > volumes.opportunities) {
    notes.push("More closed deals than opportunities — check these numbers.");
  }

  const targets = KPI_TARGETS[inputs.industry as IndustryKey];
  const [t1, t2, t3] = targets;

  const r1 = safeRate(volumes.qualified, volumes.leads);
  const r2 = safeRate(volumes.opportunities, volumes.qualified);
  const r3 = safeRate(volumes.won, volumes.opportunities);

  const mult = annualMultiplier(inputs.period);
  const D = inputs.avgDealValue;
  const currentPeriodRevenue = volumes.won * D;
  const currentAnnualRevenue = currentPeriodRevenue * mult;

  // Per-stage recoverable: hold other stages at current rates, lift this stage to target.
  const r2eff = r2 ?? 0;
  const r3eff = r3 ?? 0;

  // Stage 1 leak: Vqualified' = Vleads*t1, downstream uses current r2, r3
  const wonIfStage1Hit = volumes.leads * t1 * r2eff * r3eff;
  const recoverable1 = Math.max(0, wonIfStage1Hit - volumes.won) * D * mult;

  // Stage 2 leak: Vopps' = Vqualified*t2, downstream uses current r3
  const wonIfStage2Hit = volumes.qualified * t2 * r3eff;
  const recoverable2 = Math.max(0, wonIfStage2Hit - volumes.won) * D * mult;

  // Stage 3 leak: Vwon' = Vopps*t3
  const wonIfStage3Hit = volumes.opportunities * t3;
  const recoverable3 = Math.max(0, wonIfStage3Hit - volumes.won) * D * mult;

  const transitions: StageTransition[] = [
    {
      key: "leads->qualified",
      fromKey: "leads",
      toKey: "qualified",
      fromLabel: STAGES[0].label,
      toLabel: STAGES[1].label,
      currentRate: r1,
      targetRate: t1,
      gap: r1 == null ? t1 : Math.max(0, t1 - r1),
      recoverableAnnualRevenue: recoverable1,
      isBottleneck: r1 != null && r1 < t1 && recoverable1 > 0,
    },
    {
      key: "qualified->opportunities",
      fromKey: "qualified",
      toKey: "opportunities",
      fromLabel: STAGES[1].label,
      toLabel: STAGES[2].label,
      currentRate: r2,
      targetRate: t2,
      gap: r2 == null ? t2 : Math.max(0, t2 - r2),
      recoverableAnnualRevenue: recoverable2,
      isBottleneck: r2 != null && r2 < t2 && recoverable2 > 0,
    },
    {
      key: "opportunities->won",
      fromKey: "opportunities",
      toKey: "won",
      fromLabel: STAGES[2].label,
      toLabel: STAGES[3].label,
      currentRate: r3,
      targetRate: t3,
      gap: r3 == null ? t3 : Math.max(0, t3 - r3),
      recoverableAnnualRevenue: recoverable3,
      isBottleneck: r3 != null && r3 < t3 && recoverable3 > 0,
    },
  ];

  const rankedBottlenecks = transitions
    .filter((t) => t.isBottleneck)
    .sort((a, b) => b.recoverableAnnualRevenue - a.recoverableAnnualRevenue);

  return {
    valid: true,
    notes,
    volumes,
    currentPeriodRevenue,
    currentAnnualRevenue,
    transitions,
    rankedBottlenecks,
  };
}

/**
 * Project the won deals + annual revenue if a single stage's conversion rate
 * is lifted to `liftedRate`, holding other stages at their current rates.
 */
export function projectWhatIf(
  result: FunnelResult,
  stageKey: StageTransition["key"],
  liftedRate: number,
  avgDealValue: number,
  period: ConversionInputs["period"],
): { projectedWon: number; uplift: number; annualUplift: number } {
  if (!result.valid) {
    return { projectedWon: 0, uplift: 0, annualUplift: 0 };
  }
  const { volumes } = result;
  const r2 = result.transitions[1].currentRate ?? 0;
  const r3 = result.transitions[2].currentRate ?? 0;
  let projectedWon = volumes.won;

  if (stageKey === "leads->qualified") {
    projectedWon = volumes.leads * liftedRate * r2 * r3;
  } else if (stageKey === "qualified->opportunities") {
    projectedWon = volumes.qualified * liftedRate * r3;
  } else if (stageKey === "opportunities->won") {
    projectedWon = volumes.opportunities * liftedRate;
  }

  const uplift = Math.max(0, projectedWon - volumes.won);
  const annualUplift = uplift * avgDealValue * annualMultiplier(period);
  return { projectedWon, uplift, annualUplift };
}

function emptyResult(volumes: StageVolumes, reason: FunnelResult["reason"]): FunnelResult {
  return {
    valid: false,
    reason,
    notes: [],
    volumes,
    currentPeriodRevenue: 0,
    currentAnnualRevenue: 0,
    transitions: [],
    rankedBottlenecks: [],
  };
}

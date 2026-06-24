import type { PeriodKey, StageKey } from "../config";

export type StageVolumes = Record<StageKey, number>;

export type ConversionInputs = {
  /** Free-text industry as typed by the owner. Stored verbatim. */
  industry: string | null;
  period: PeriodKey;
  avgDealValue: number | null;
  volumes: Partial<StageVolumes>;
};

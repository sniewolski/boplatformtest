import { STAGES, type StageKey } from "../config";
import type { ConversionInputs, StageVolumes } from "./types";

/**
 * Live validation for the Conversion Review inputs.
 *
 * Philosophy:
 *  - Let owners type freely; never silently clamp; never force an entry order.
 *  - Surface an error only once a field has a value that violates a rule —
 *    don't yell at empty fields.
 *  - Each stage must be a non-negative integer and ≤ the stage directly above
 *    it in STAGES (so it generalises if STAGES changes).
 *  - avg_deal_value must be > 0 once entered.
 *
 * The error-state red is functional (danger/attention). Because results are
 * hidden while errors exist, leak-red and error-red never co-occur on screen.
 */

export type VolumeError = {
  reason: "negative" | "not-integer" | "exceeds-previous";
  message: string;
  /** The previous stage's value used as the bound, when applicable. */
  bound?: { stageKey: StageKey; stageLabel: string; value: number };
};

export type ValidationResult = {
  /** Per-stage errors, keyed by StageKey. Stages without a value/error are omitted. */
  volumeErrors: Partial<Record<StageKey, VolumeError>>;
  /** Error on avg_deal_value, when entered but invalid. */
  dealValueError: string | null;
  /** True when nothing is broken AND every required input is present. */
  valid: boolean;
  /** True when at least one field is broken (independent of completeness). */
  hasErrors: boolean;
  /** Convenience: total count of broken fields. */
  errorCount: number;
};

export function validateInputs(inputs: ConversionInputs): ValidationResult {
  const volumeErrors: Partial<Record<StageKey, VolumeError>> = {};

  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const raw = inputs.volumes[stage.key];
    if (raw == null || (typeof raw === "number" && Number.isNaN(raw))) continue;
    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      volumeErrors[stage.key] = {
        reason: "negative",
        message: "Must be zero or greater.",
      };
      continue;
    }
    if (!Number.isInteger(value)) {
      volumeErrors[stage.key] = {
        reason: "not-integer",
        message: "Whole number only.",
      };
      continue;
    }

    if (i > 0) {
      const prev = STAGES[i - 1];
      const prevRaw = inputs.volumes[prev.key];
      const prevValue =
        prevRaw == null || Number.isNaN(Number(prevRaw)) ? null : Number(prevRaw);
      if (prevValue != null && Number.isFinite(prevValue) && value > prevValue) {
        volumeErrors[stage.key] = {
          reason: "exceeds-previous",
          message: `Can't exceed ${prev.label} (${prevValue.toLocaleString()}).`,
          bound: { stageKey: prev.key, stageLabel: prev.label, value: prevValue },
        };
      }
    }
  }

  let dealValueError: string | null = null;
  if (inputs.avgDealValue != null) {
    if (!Number.isFinite(inputs.avgDealValue) || inputs.avgDealValue <= 0) {
      dealValueError = "Must be greater than zero.";
    }
  }

  const errorCount =
    Object.keys(volumeErrors).length + (dealValueError ? 1 : 0);
  const hasErrors = errorCount > 0;

  const allRequiredPresent =
    !!inputs.industry &&
    inputs.avgDealValue != null &&
    STAGES.every((s) => {
      const v = inputs.volumes[s.key];
      return v != null && Number.isFinite(Number(v));
    });

  return {
    volumeErrors,
    dealValueError,
    valid: !hasErrors && allRequiredPresent,
    hasErrors,
    errorCount,
  };
}

/** Sanitises a partial volumes record to a complete StageVolumes (NaN for missing). */
export function asStageVolumes(partial: Partial<StageVolumes>): StageVolumes {
  return {
    leads: Number(partial.leads ?? NaN),
    qualified: Number(partial.qualified ?? NaN),
    opportunities: Number(partial.opportunities ?? NaN),
    won: Number(partial.won ?? NaN),
  };
}

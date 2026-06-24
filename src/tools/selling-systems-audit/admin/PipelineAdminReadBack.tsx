import type { CurrencyCode } from "@/lib/format-currency";
import {
  labelOf,
  chipsLabels,
  money as moneyText,
  ReadRow,
  ReadGroup,
} from "../components/ReadBack";
import {
  TREND_OPTIONS,
  AGE_BANDS,
  PROPORTION_BANDS,
  STAGES_CANONICAL,
  DURATION_BANDS,
  FORECAST_METHODS,
  FORECAST_HORIZONS,
  REVIEW_CADENCES,
  TEAM_REVIEW_METHODS,
  REVIEW_DATA_POINTS,
} from "../config";

/**
 * Admin read-back of one owner's Pipeline submission. Mirrors the owner-side
 * SummaryStep in PipelineHealth.tsx 1:1 — same field order, same labels,
 * same option sets, same coverage math.
 */

type AnyMap = Record<string, unknown>;
const asObj = (v: unknown): AnyMap =>
  v && typeof v === "object" ? (v as AnyMap) : {};
const asStr = (v: unknown): string | null =>
  typeof v === "string" ? v : null;
const asNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const asBool = (v: unknown): boolean | null =>
  typeof v === "boolean" ? v : null;
const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function PipelineAdminReadBack({
  answers,
  currency,
}: {
  answers: AnyMap;
  currency: CurrencyCode | null;
}) {
  const volume = asObj(answers.volume);
  const velocity = asObj(answers.velocity);
  const forecasting = asObj(answers.forecasting);

  const pipelineValue = asNum(volume.pipelineValue);
  const target = asNum(volume.quarterlyTarget);
  const activeOppCount = asNum(volume.activeOppCount);

  const money = (v: number | null) => moneyText(v, currency);

  const stallStage = asStr(velocity.stallStage);
  const stallStageOther = asStr(velocity.stallStageOther);
  const stallStageLabel =
    stallStage === "other"
      ? (stallStageOther?.trim() || "Other")
      : labelOf(STAGES_CANONICAL, stallStage);

  const hasSalespeople = asBool(forecasting.hasSalespeople);
  const reviewCadence = asStr(forecasting.reviewCadence);
  const reviewsAtAll = reviewCadence != null && reviewCadence !== "never";

  return (
    <div className="flex flex-col gap-6">
      <ReadGroup title="Volume & coverage">
        <ReadRow label="Open pipeline value" value={money(pipelineValue)} />
        <ReadRow label="Quarterly target" value={money(target)} />
        <ReadRow
          label="Open opportunities"
          value={activeOppCount == null ? "—" : String(activeOppCount)}
        />
        <ReadRow
          label="90-day trend"
          value={labelOf(TREND_OPTIONS, asStr(volume.trend90d))}
        />
      </ReadGroup>

      <ReadGroup title="Velocity & stalling">
        <ReadRow
          label="Average opportunity age"
          value={labelOf(AGE_BANDS, asStr(velocity.avgOppAge))}
        />
        <ReadRow
          label="No activity in 30 days"
          value={labelOf(PROPORTION_BANDS, asStr(velocity.noActivity30d))}
        />
        <ReadRow
          label="Past typical cycle"
          value={labelOf(PROPORTION_BANDS, asStr(velocity.stuckPastCycle))}
        />
        <ReadRow label="Most common stall stage" value={stallStageLabel} />
        <ReadRow
          label="Typical stall length"
          value={labelOf(DURATION_BANDS, asStr(velocity.stallDuration))}
        />
      </ReadGroup>

      <ReadGroup title="Forecasting & visibility">
        <ReadRow
          label="Forecast method"
          value={labelOf(FORECAST_METHODS, asStr(forecasting.forecastMethod))}
        />
        <ReadRow
          label="Forecast horizon"
          value={labelOf(FORECAST_HORIZONS, asStr(forecasting.forecastHorizon))}
        />
        <ReadRow
          label="Pipeline review cadence"
          value={labelOf(REVIEW_CADENCES, reviewCadence)}
        />
        <ReadRow
          label="Has salespeople"
          value={hasSalespeople == null ? "—" : hasSalespeople ? "Yes" : "No"}
        />
        {hasSalespeople && (
          <>
            <ReadRow
              label="Team review cadence"
              value={labelOf(REVIEW_CADENCES, asStr(forecasting.teamReviewCadence))}
            />
            <ReadRow
              label="Team review methods"
              value={chipsLabels(
                TEAM_REVIEW_METHODS,
                asStrArr(forecasting.teamReviewMethods),
                asStr(forecasting.teamReviewMethodsOther) ?? undefined,
              )}
            />
          </>
        )}
        {reviewsAtAll && (
          <>
            <ReadRow
              label="Data reviewed"
              value={chipsLabels(
                REVIEW_DATA_POINTS,
                asStrArr(forecasting.reviewDataPoints),
                asStr(forecasting.reviewDataOther) ?? undefined,
              )}
            />
            <ReadRow
              label="Decisions from reviews"
              value={asStr(forecasting.reviewDecisions)?.trim() || "—"}
            />
          </>
        )}
      </ReadGroup>
    </div>
  );
}

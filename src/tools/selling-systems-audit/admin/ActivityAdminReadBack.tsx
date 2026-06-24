import {
  labelOf,
  chipsLabels,
  ReadRow,
  ReadGroup,
} from "../components/ReadBack";
import {
  ACTIVITY_METRICS,
  TRACKING_METHOD,
  CALLS_BAND,
  EMAILS_BAND,
  MEETINGS_BAND,
  ACTIVITY_TREND,
  ACTIVITY_CONFIDENCE,
  ACTIVITY_CONSISTENCY,
  STRONGEST_METRIC,
  GOALS_SET,
  DATA_TRUST,
} from "../config";

/**
 * Admin read-back of one owner's Sales Activity submission. Mirrors the
 * owner-side ReviewStep in SalesActivity.tsx 1:1.
 */

type AnyMap = Record<string, unknown>;
const asObj = (v: unknown): AnyMap =>
  v && typeof v === "object" ? (v as AnyMap) : {};
const asStr = (v: unknown): string | null =>
  typeof v === "string" ? v : null;
const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function ActivityAdminReadBack({ answers }: { answers: AnyMap }) {
  const tracking = asObj(answers.tracking);
  const volume = asObj(answers.volume);
  const quality = asObj(answers.quality);

  const strongestMetric = asStr(quality.strongestMetric);
  const strongestMetricOther = asStr(quality.strongestMetricOther);
  const strongest =
    strongestMetric === "other"
      ? (strongestMetricOther?.trim() || "—")
      : labelOf(STRONGEST_METRIC, strongestMetric);
  const goalsSet = asStr(quality.goalsSet);

  return (
    <div className="flex flex-col gap-6">
      <ReadGroup title="What you track">
        <ReadRow
          label="Metrics tracked"
          value={chipsLabels(
            ACTIVITY_METRICS,
            asStrArr(tracking.metrics),
            undefined,
          )}
        />
        <ReadRow
          label="How it's captured"
          value={labelOf(TRACKING_METHOD, asStr(tracking.trackingMethod))}
        />
      </ReadGroup>

      <ReadGroup title="Activity volume">
        <ReadRow label="Calls / week" value={labelOf(CALLS_BAND, asStr(volume.callsBand))} />
        <ReadRow label="Emails / week" value={labelOf(EMAILS_BAND, asStr(volume.emailsBand))} />
        <ReadRow label="Meetings / week" value={labelOf(MEETINGS_BAND, asStr(volume.meetingsBand))} />
        <ReadRow label="Trend vs last quarter" value={labelOf(ACTIVITY_TREND, asStr(volume.trend))} />
      </ReadGroup>

      <ReadGroup title="Quality & confidence">
        <ReadRow label="Confidence" value={labelOf(ACTIVITY_CONFIDENCE, asStr(quality.confidence))} />
        <ReadRow label="Consistency" value={labelOf(ACTIVITY_CONSISTENCY, asStr(quality.consistency))} />
        <ReadRow label="Strongest signal" value={strongest} />
        <ReadRow label="Activity goals" value={labelOf(GOALS_SET, goalsSet)} />
        {goalsSet === "yes" && (
          <ReadRow label="Why those goals" value={asStr(quality.goalsWhy)?.trim() || "—"} />
        )}
        <ReadRow label="Trust in data" value={labelOf(DATA_TRUST, asStr(quality.dataTrust))} />
      </ReadGroup>
    </div>
  );
}

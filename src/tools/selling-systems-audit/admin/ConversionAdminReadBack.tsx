import type { CurrencyCode } from "@/lib/format-currency";
import {
  labelOf,
  chipsLabels,
  pct,
  money,
  numberWithUnit,
  boolText,
  ReadRow,
  ReadGroup,
  ReadMapRows,
} from "../components/ReadBack";
import {
  PERIODS,
  STAGES,
  LEAD_SOURCES,
  SOURCE_QUALITY_LEVELS,
  QUALIFICATION_CRITERIA,
  NON_QUALIFY_PATTERNS,
  DISCOVERY_LENGTH_BANDS,
  DISCOVERY_STALL_REASONS,
  DISCOVERY_STRUCTURE_LEVELS,
  RATING_LEVELS,
  CYCLE_LENGTH_UNITS,
  TOUCHPOINT_BANDS,
  CLOSE_TREND_OPTIONS,
} from "../config";

/**
 * Admin read-back of a single owner's Conversion submission. Mirrors the
 * owner-side ReviewStep in ConversionReview.tsx 1:1 (same ReadBack primitives,
 * same option-set keys, same field ordering) so the coach sees exactly what
 * the owner saw on review. Dense, scannable, call-prep oriented.
 *
 * Decoupled from form state — takes a plain submitted_answers JSON blob.
 */

type AnyMap = Record<string, unknown>;

function asObj(v: unknown): AnyMap {
  return v && typeof v === "object" ? (v as AnyMap) : {};
}

function asStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asStrMap(v: unknown): Record<string, string> {
  const obj = asObj(v);
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

const intOrDash = (n: number | null) => (n == null ? "—" : String(n));
const textOrDash = (s: string | null) => (s && s.trim() ? s.trim() : "—");

export function ConversionAdminReadBack({
  answers,
  currency,
}: {
  answers: AnyMap;
  currency: CurrencyCode | null;
}) {
  const foundation = asObj(answers.foundation);
  const leadGen = asObj(answers.leadGeneration);
  const prospecting = asObj(answers.prospecting);
  const discovery = asObj(answers.discovery);
  const proposal = asObj(answers.proposal);
  const closing = asObj(answers.closing);
  const summary = asObj(answers.summary);

  const volumes = asObj(foundation.volumes);
  const sources = asStrArr(leadGen.sources);
  const ownTargets = asObj(summary.ownTargets);

  return (
    <div className="flex flex-col gap-6">
      <ReadGroup title="Foundation">
        <ReadRow label="Industry" value={textOrDash(asStr(foundation.industry))} />
        <ReadRow label="Period" value={labelOf(PERIODS, asStr(foundation.period))} />
        <ReadRow
          label="Average deal value"
          value={money(asNum(foundation.avgDealValue), currency)}
        />
        {STAGES.map((s) => (
          <ReadRow
            key={s.key}
            label={`${s.label} (volume)`}
            value={intOrDash(asNum((volumes as AnyMap)[s.key]))}
          />
        ))}
      </ReadGroup>

      <ReadGroup title="Lead generation">
        <ReadRow
          label="Sources"
          value={chipsLabels(
            LEAD_SOURCES,
            sources,
            asStr(leadGen.sourceOther) ?? undefined,
          )}
        />
        <ReadMapRows
          sources={sources}
          sourceOptions={LEAD_SOURCES}
          map={asObj(leadGen.allocation)}
          renderValue={(raw) => (typeof raw === "number" ? pct(raw) : "—")}
          emptyLabel="Allocation"
        />
        <ReadMapRows
          sources={sources}
          sourceOptions={LEAD_SOURCES}
          map={asStrMap(leadGen.sourceQuality)}
          renderValue={(raw) =>
            typeof raw === "string" ? labelOf(SOURCE_QUALITY_LEVELS, raw) : "—"
          }
          emptyLabel="Source quality"
        />
        <ReadRow label="Quality notes" value={textOrDash(asStr(leadGen.qualityNotes))} />
      </ReadGroup>

      <ReadGroup title="Prospecting">
        <ReadRow
          label="Qualification criteria"
          value={chipsLabels(
            QUALIFICATION_CRITERIA,
            asStrArr(prospecting.criteria),
            asStr(prospecting.criteriaOther) ?? undefined,
          )}
        />
        <ReadRow
          label="Non-qualify patterns"
          value={chipsLabels(
            NON_QUALIFY_PATTERNS,
            asStrArr(prospecting.nonQualifyPatterns),
            asStr(prospecting.nonQualifyOther) ?? undefined,
          )}
        />
      </ReadGroup>

      <ReadGroup title="Discovery">
        <ReadRow
          label="Discovery → Proposal rate"
          value={pct(asNum(discovery.discoveryToProposalRate))}
        />
        <ReadRow
          label="Call length band"
          value={labelOf(DISCOVERY_LENGTH_BANDS, asStr(discovery.callLengthBand))}
        />
        <ReadRow
          label="Varies by deal size"
          value={boolText(asBool(discovery.variesByDealSize))}
        />
        <ReadRow
          label="Stall reasons"
          value={chipsLabels(
            DISCOVERY_STALL_REASONS,
            asStrArr(discovery.stallReasons),
            asStr(discovery.stallReasonsOther) ?? undefined,
          )}
        />
        <ReadRow
          label="Structure level"
          value={labelOf(DISCOVERY_STRUCTURE_LEVELS, asStr(discovery.structureLevel))}
        />
        <ReadRow
          label="Confidence"
          value={labelOf(RATING_LEVELS, asStr(discovery.confidence))}
        />
      </ReadGroup>

      <ReadGroup title="Proposal">
        <ReadRow
          label="Proposal → Close rate"
          value={pct(asNum(proposal.proposalToCloseRate))}
        />
        <ReadRow label="Ghosted rate" value={pct(asNum(proposal.ghostedRate))} />
      </ReadGroup>

      <ReadGroup title="Closing">
        <ReadRow
          label="Sales cycle"
          value={numberWithUnit(
            asNum(closing.cycleLength),
            asStr(closing.cycleUnit),
            CYCLE_LENGTH_UNITS,
          )}
        />
        <ReadRow
          label="Touchpoints"
          value={labelOf(TOUCHPOINT_BANDS, asStr(closing.touchpointsBand))}
        />
      </ReadGroup>

      <ReadGroup title="Targets & trend">
        <ReadRow
          label="Has defined targets"
          value={boolText(asBool(summary.hasDefinedTargets))}
        />
        {asBool(summary.hasDefinedTargets) === true && (
          <>
            <ReadRow
              label="Leads → Qualified target"
              value={pct(asNum(ownTargets.leadsToQualified))}
            />
            <ReadRow
              label="Qualified → Opportunities target"
              value={pct(asNum(ownTargets.qualifiedToOpportunities))}
            />
            <ReadRow
              label="Opportunities → Won target"
              value={pct(asNum(ownTargets.opportunitiesToWon))}
            />
          </>
        )}
        <ReadRow
          label="Close-rate trend"
          value={labelOf(CLOSE_TREND_OPTIONS, asStr(summary.closeRateTrend))}
        />
        <ReadRow label="Trend note" value={textOrDash(asStr(summary.closeRateTrendNote))} />
      </ReadGroup>
    </div>
  );
}

import {
  labelOf,
  chipsLabels,
  ReadRow,
  ReadGroup,
  ReadText,
} from "../components/ReadBack";
import {
  ALIGN_CADENCE,
  CPA_MEASUREMENT,
  DEAL_TRACING,
  EXPECTATION_GAP,
  FUNNEL_STAGES,
  ICP_ALIGNMENT,
  INSIGHT_FLOWBACK,
  LEAD_MATCH,
  OBJECTION_CONTENT,
  PAIN_MATCH,
  SHARED_GOALS,
} from "../config";

/**
 * Admin read-back of one owner's Sales/Marketing Alignment submission.
 * Mirrors the owner-side ReviewStep in Alignment.tsx 1:1.
 */

type AnyMap = Record<string, unknown>;
const asObj = (v: unknown): AnyMap =>
  v && typeof v === "object" ? (v as AnyMap) : {};
const asStr = (v: unknown): string | null =>
  typeof v === "string" ? v : null;
const asBool = (v: unknown): boolean | null =>
  typeof v === "boolean" ? v : null;
const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function AlignmentAdminReadBack({ answers }: { answers: AnyMap }) {
  const leadQuality = asObj(answers.leadQuality);
  const consistency = asObj(answers.consistency);
  const feedback = asObj(answers.feedback);
  const enablement = asObj(answers.enablement);
  const attribution = asObj(answers.attribution);

  const expectationGap = asStr(consistency.expectationGap);
  const separateTeams = asBool(feedback.separateTeams);
  const separateTeamsLabel =
    separateTeams == null ? "—" : separateTeams ? "Yes" : "No";

  return (
    <div className="flex flex-col gap-6">
      <ReadGroup title="Lead quality & handoff">
        <ReadRow label="ICP alignment" value={labelOf(ICP_ALIGNMENT, asStr(leadQuality.icpAlignment))} />
        <ReadRow label="Leads match closeable profile" value={labelOf(LEAD_MATCH, asStr(leadQuality.leadMatch))} />
      </ReadGroup>

      <ReadGroup title="Message consistency">
        <ReadRow label="Prospect expectation gap" value={labelOf(EXPECTATION_GAP, expectationGap)} />
        {expectationGap === "yes" && (
          <ReadText label="What was the gap?" value={asStr(consistency.expectationGapDetail)} />
        )}
        <ReadRow label="Pains match discovery" value={labelOf(PAIN_MATCH, asStr(consistency.painPointMatch))} />
      </ReadGroup>

      <ReadGroup title="Feedback loops">
        <ReadRow label="Sales insight back to marketing" value={labelOf(INSIGHT_FLOWBACK, asStr(feedback.insightFlowback))} />
        <ReadRow label="Separate sales & marketing teams" value={separateTeamsLabel} />
        <ReadRow
          label={
            separateTeams === true
              ? "Sales & marketing review cadence"
              : "Both-function review cadence"
          }
          value={labelOf(ALIGN_CADENCE, asStr(feedback.reviewCadence))}
        />
      </ReadGroup>

      <ReadGroup title="Content & enablement">
        <ReadRow
          label="Funnel stages with content"
          value={chipsLabels(FUNNEL_STAGES, asStrArr(enablement.stageContent), undefined)}
        />
        <ReadRow label="Objection-handling content" value={labelOf(OBJECTION_CONTENT, asStr(enablement.objectionContent))} />
      </ReadGroup>

      <ReadGroup title="Attribution & measurement">
        <ReadRow label="Deal tracing to source" value={labelOf(DEAL_TRACING, asStr(attribution.dealTracing))} />
        <ReadRow label="CPA by channel" value={labelOf(CPA_MEASUREMENT, asStr(attribution.cpaByChannel))} />
        <ReadRow label="Shared goals" value={labelOf(SHARED_GOALS, asStr(attribution.sharedGoals))} />
      </ReadGroup>
    </div>
  );
}

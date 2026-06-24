import {
  labelOf,
  chipsLabels,
  ReadRow,
  ReadGroup,
  ReadText,
} from "../components/ReadBack";
import {
  ICP_WRITTEN,
  ICP_BASIS,
  YES_SOMEWHAT_NO,
  RECOGNITION,
  MESSAGE_LEVEL,
  CAN_TELL,
  COMPETE_BASIS,
  EVIDENCE_TYPES,
  PROOF_SPECIFICITY,
  PROOF_TARGETING,
  CONSISTENCY_LEVELS,
  MATCH_LEVELS,
} from "../config";

/**
 * Admin read-back of one owner's Messaging submission. Mirrors the
 * owner-side ReviewStep in Messaging.tsx 1:1.
 */

type AnyMap = Record<string, unknown>;
const asObj = (v: unknown): AnyMap =>
  v && typeof v === "object" ? (v as AnyMap) : {};
const asStr = (v: unknown): string | null =>
  typeof v === "string" ? v : null;
const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const textOrDash = (s: string | null) => (s && s.trim() ? s.trim() : "—");

export function MessagingAdminReadBack({ answers }: { answers: AnyMap }) {
  const icp = asObj(answers.icp);
  const problem = asObj(answers.problem);
  const value = asObj(answers.value);
  const proof = asObj(answers.proof);
  const consistency = asObj(answers.consistency);

  const evidenceTypes = asStrArr(proof.evidenceTypes);
  const evidenceOther = evidenceTypes.includes("other")
    ? asStr(proof.evidenceOther) ?? undefined
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <ReadGroup title="Ideal customer clarity">
        <ReadRow label="Industry" value={textOrDash(asStr(icp.industry))} />
        <ReadRow label="Company size" value={textOrDash(asStr(icp.companySize))} />
        <ReadRow label="Role" value={textOrDash(asStr(icp.role))} />
        <ReadText label="Situation" value={asStr(icp.situation)} />
        <ReadText label="Mindset" value={asStr(icp.mindset)} />
        <ReadRow label="Written down" value={labelOf(ICP_WRITTEN, asStr(icp.written))} />
        <ReadRow label="How arrived at" value={labelOf(ICP_BASIS, asStr(icp.basis))} />
      </ReadGroup>

      <ReadGroup title="Problem & pain clarity">
        <ReadText label="Most painful problem" value={asStr(problem.painfulProblem)} />
        <ReadRow label="In client's language" value={labelOf(YES_SOMEWHAT_NO, asStr(problem.clientLanguage))} />
        <ReadRow label="Prospects recognise themselves" value={labelOf(RECOGNITION, asStr(problem.selfRecognition))} />
        <ReadRow label="Pain level" value={labelOf(MESSAGE_LEVEL, asStr(problem.messageLevel))} />
      </ReadGroup>

      <ReadGroup title="Value proposition">
        <ReadText label="Outcome delivered" value={asStr(value.outcome)} />
        <ReadRow label="For whom" value={textOrDash(asStr(value.forWhom))} />
        <ReadRow label="Timeframe" value={textOrDash(asStr(value.timeframe))} />
        <ReadText label="One- or two-sentence value prop" value={asStr(value.oneSentence)} />
        <ReadText label="What makes you different" value={asStr(value.differentiation)} />
        <ReadRow label="Prospects can tell" value={labelOf(CAN_TELL, asStr(value.prospectsCanTell))} />
        <ReadRow label="Competing on" value={labelOf(COMPETE_BASIS, asStr(value.competeBasis))} />
        <ReadText label="Why best clients chose you" value={asStr(value.bestClientReason)} />
      </ReadGroup>

      <ReadGroup title="Proof & credibility">
        <ReadRow
          label="Evidence types"
          value={chipsLabels(EVIDENCE_TYPES, evidenceTypes, evidenceOther)}
        />
        <ReadRow label="Proof specificity" value={labelOf(PROOF_SPECIFICITY, asStr(proof.proofSpecificity))} />
        <ReadRow label="Proof targeting" value={labelOf(PROOF_TARGETING, asStr(proof.proofTargeting))} />
        <ReadText label="What you'd show a sceptic" value={asStr(proof.skepticProof)} />
      </ReadGroup>

      <ReadGroup title="Message consistency">
        <ReadRow
          label="Across touchpoints"
          value={labelOf(CONSISTENCY_LEVELS, asStr(consistency.crossChannel))}
        />
        <ReadRow
          label="Clients' description matches"
          value={labelOf(MATCH_LEVELS, asStr(consistency.clientDescriptionMatch))}
        />
      </ReadGroup>
    </div>
  );
}

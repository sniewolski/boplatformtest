import {
  labelOf,
  chipsLabels,
  boolText,
  ReadRow,
  ReadGroup,
  ReadStages,
} from "../components/ReadBack";
import type { SalesStage } from "../config";
import {
  DOCUMENTATION_LEVELS,
  PROCESS_CONSISTENCY,
  REPLICABILITY,
  ADHERENCE,
  QUALITY_ASSESSMENT,
  SCRIPT_MOMENTS,
  EXPERIENCE_CONSISTENCY,
  CRM_OPTIONS,
  UPDATE_FREQUENCY,
  DOC_TEMPLATES,
  ENABLEMENT,
} from "../config";

/**
 * Admin read-back of one owner's Sales Process submission. Mirrors the
 * owner-side ReviewStep in SalesProcess.tsx 1:1.
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

function asStages(v: unknown): SalesStage[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (s): s is SalesStage =>
      !!s &&
      typeof s === "object" &&
      typeof (s as { id?: unknown }).id === "string" &&
      typeof (s as { name?: unknown }).name === "string",
  );
}

export function ProcessAdminReadBack({ answers }: { answers: AnyMap }) {
  const definition = asObj(answers.definition);
  const stages = asObj(answers.stages);
  const adherence = asObj(answers.adherence);
  const tools = asObj(answers.tools);

  const stageItems = asStages(stages.items);
  const keyStageIds = asStrArr(tools.keyStages);
  const stageById = new Map(
    stageItems.map((s) => [s.id, s.name.trim()] as const),
  );
  const keyStageLabels =
    keyStageIds
      .map((id) => stageById.get(id))
      .filter((n): n is string => !!n && n.length > 0)
      .join(", ") || "—";

  const measuresAdherence = asBool(adherence.measuresAdherence);
  const crm = asStrArr(tools.crm);
  const showUpdateFreq =
    crm.length > 0 && !(crm.length === 1 && crm[0] === "none");

  return (
    <div className="flex flex-col gap-6">
      <ReadGroup title="Process definition">
        <ReadRow
          label="Documentation"
          value={labelOf(DOCUMENTATION_LEVELS, asStr(definition.documentationLevel))}
        />
        <ReadRow
          label="Consistency"
          value={labelOf(PROCESS_CONSISTENCY, asStr(definition.consistency))}
        />
        <ReadRow
          label="Replicable"
          value={labelOf(REPLICABILITY, asStr(definition.replicability))}
        />
      </ReadGroup>

      <ReadGroup title="Stages">
        <ReadStages items={stageItems} />
      </ReadGroup>

      <ReadGroup title="Adherence & quality">
        <ReadRow label="Measures adherence" value={boolText(measuresAdherence)} />
        {measuresAdherence && (
          <ReadRow
            label="Adherence level"
            value={labelOf(ADHERENCE, asStr(adherence.adherenceLevel))}
          />
        )}
        <ReadRow
          label="Quality assessment"
          value={labelOf(QUALITY_ASSESSMENT, asStr(adherence.qualityAssessment))}
        />
        <ReadRow
          label="Scripted moments"
          value={chipsLabels(
            SCRIPT_MOMENTS,
            asStrArr(adherence.scriptMoments),
            asStr(adherence.scriptMomentsOther) ?? undefined,
          )}
        />
        <ReadRow
          label="Buyer experience consistency"
          value={labelOf(EXPERIENCE_CONSISTENCY, asStr(adherence.experienceConsistency))}
        />
      </ReadGroup>

      <ReadGroup title="Tools & enablement">
        <ReadRow
          label="Deal tracking"
          value={chipsLabels(
            CRM_OPTIONS,
            crm,
            asStr(tools.crmOther) ?? undefined,
          )}
        />
        {showUpdateFreq && (
          <ReadRow
            label="Update frequency"
            value={labelOf(UPDATE_FREQUENCY, asStr(tools.updateFrequency))}
          />
        )}
        <ReadRow
          label="Documents & templates"
          value={chipsLabels(
            DOC_TEMPLATES,
            asStrArr(tools.docTemplates),
            asStr(tools.docTemplatesOther) ?? undefined,
          )}
        />
        <ReadRow
          label="Enablement"
          value={chipsLabels(
            ENABLEMENT,
            asStrArr(tools.enablement),
            asStr(tools.enablementOther) ?? undefined,
          )}
        />
        <ReadRow label="Priority stages" value={keyStageLabels} />
      </ReadGroup>
    </div>
  );
}

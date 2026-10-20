import type { SosaField, SosaQuestion } from "../../config/questionBank";
import type { SosaFieldValue } from "../../types";
import type { SosaAnswerApi } from "../../data/sosaAnswers";
import { useSosaAnswers } from "../../data/sosaAnswers";
import { isFieldVisible } from "../../engine/rules";
import {
  ChoiceField,
  MultiField,
  NumberField,
  ScriptField,
  TextField,
  YesNoField,
  type ChoiceValue,
  type MultiValue,
} from "./Fields";
import { UploadField } from "./UploadField";
import { LinkedFieldControl, ListFieldControl } from "./ListFields";

/** Renders one field of a question with the right control, honouring showWhen. */
export function FieldRenderer({
  question,
  field,
  api,
}: {
  question: SosaQuestion;
  field: SosaField;
  api: SosaAnswerApi;
}) {
  const { answers } = useSosaAnswers();
  const { answer, setFieldValue, setEstimate } = api;
  if (!isFieldVisible(field, answer, question.id, answers ?? {})) return null;

  const v = answer.value[field.key];
  const set = (next: SosaFieldValue | undefined) => setFieldValue(field.key, next);
  const label = field.label ?? question.prompt;

  let control: React.ReactNode;
  switch (field.type) {
    case "choice":
      control = (
        <ChoiceField options={field.options} allowOther={field.allowOther} value={v as ChoiceValue} onChange={set} />
      );
      break;
    case "multi":
      control = (
        <MultiField options={field.options} allowOther={field.allowOther} value={v as MultiValue} onChange={set} />
      );
      break;
    case "yesno":
      control = <YesNoField value={v as "yes" | "no" | undefined} onChange={set} />;
      break;
    case "number":
      control = (
        <NumberField
          unit={field.unit}
          label={label}
          value={typeof v === "number" ? v : undefined}
          onChange={set}
          estimate={!!answer.estimates[field.key]}
          onEstimateChange={(on) => setEstimate(field.key, on)}
        />
      );
      break;
    case "text":
      control = <TextField label={label} value={typeof v === "string" ? v : undefined} onChange={set} />;
      break;
    case "script":
      control = <ScriptField label={label} value={typeof v === "string" ? v : undefined} onChange={set} />;
      break;
    case "upload":
      control = <UploadField question={question} field={field} api={api} />;
      break;
    case "list":
      control = <ListFieldControl question={question} field={field} api={api} />;
      break;
    case "linked":
      control = <LinkedFieldControl field={field} api={api} />;
      break;
    default:
      control = <p className="text-ink-muted text-sm">Coming in a later phase</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {field.label && <span className="text-sm text-ink">{field.label}</span>}
      {control}
    </div>
  );
}

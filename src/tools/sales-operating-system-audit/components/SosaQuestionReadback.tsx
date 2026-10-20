import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, type CurrencyCode } from "@/lib/format-currency";
import type { SosaField, SosaQuestion } from "../config/questionBank";
import type { SosaAnswer, SosaFieldValue, SosaMarker, SosaUploadItem } from "../types";
import { getLinkedRows, hasValue, isEditedAfterSubmit, isFieldVisible, isQuestionAnswered, type Answers } from "../engine/rules";
import { formatSosaReviewDate } from "../engine/adminReview";
import { getSosaFileUrl } from "../data/sosaUploads";

const MARKER_LABELS: Record<SosaMarker, string> = {
  dont_know: "Don't know", not_doing: "We don't do this", dont_have: "We don't have this",
};

function UploadReadback({ item, slotLabel }: { item: SosaUploadItem; slotLabel?: string }) {
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  async function openFile() {
    if (item.kind !== "file") return;
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setError(false);
    setOpening(true);
    try {
      const url = await getSosaFileUrl(item.path);
      if (tab) tab.location.href = url;
      else setError(true);
    } catch {
      tab?.close();
      setError(true);
    } finally { setOpening(false); }
  }
  const linkUrl = item.kind === "link" && /^https?:\/\//i.test(item.url) ? item.url : null;
  return <div className="flex flex-col gap-1">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {slotLabel && <span className="text-ink-muted">{slotLabel}:</span>}
      <span className="break-all">{item.name || (item.kind === "link" ? item.url : "File")}</span>
      {item.kind === "file" ? <Button variant="link" size="sm" disabled={opening} onClick={() => void openFile()}>Open</Button>
        : linkUrl && <Button asChild variant="link" size="sm"><a href={linkUrl} target="_blank" rel="noopener noreferrer">Open</a></Button>}
    </div>
    {error && <p className="text-xs text-destructive" role="alert">Couldn't open this file. Try again.</p>}
  </div>;
}

type FieldProps = {
  field: SosaField; value: SosaFieldValue | undefined; path: string;
  question: SosaQuestion; answer: SosaAnswer; answers: Answers; currency: CurrencyCode | null;
};

function FieldReadback({ field, value, path, question, answer, answers, currency }: FieldProps) {
  if (!isFieldVisible(field, answer, question.id, answers)) return null;
  let content;
  if (field.type === "linked") {
    const stored = value && typeof value === "object" && "rows" in value ? value.rows : {};
    const rows = getLinkedRows(field, answers);
    content = rows.length ? <div className="flex flex-col gap-4">{rows.map((row) =>
      <div key={row.rowKey} className="flex flex-col gap-2">
        <h5 className="text-sm font-medium">{row.label}</h5>
        {field.rowFields.map((sub) => <FieldReadback key={sub.key} field={sub} value={stored[row.rowKey]?.[sub.key]}
          path={`${path}.${row.rowKey}.${sub.key}`} question={question} answer={answer} answers={answers} currency={currency} />)}
      </div>)}</div> : <span className="text-ink-muted">No answer</span>;
  } else if (!hasValue(value)) {
    content = <span className="text-ink-muted">No answer</span>;
  } else switch (field.type) {
    case "number": {
      const numeric = typeof value === "number" ? value : null;
      const formatted = numeric === null ? "No answer" : field.unit === "money"
        ? currency ? formatCurrency(numeric, currency, { digits: 2 }) : `${numeric.toLocaleString("en-GB")} (currency not set)`
        : `${numeric.toLocaleString("en-GB")}${field.unit === "percent" ? "%" : field.unit && field.unit !== "count" ? ` ${field.unit}` : ""}`;
      content = <span className="tabular-nums">{formatted}{answer.estimates[path] && " (est.)"}</span>;
      break;
    }
    case "text": case "script":
      content = field.type === "script"
        ? <blockquote className="whitespace-pre-wrap break-words rounded-lg bg-surface-raised px-4 py-3">{typeof value === "string" ? value : "No answer"}</blockquote>
        : <div className="whitespace-pre-wrap break-words">{typeof value === "string" ? value : "No answer"}</div>;
      break;
    case "yesno": content = value === "yes" ? "Yes" : value === "no" ? "No" : "No answer"; break;
    case "choice": {
      const choice = value && typeof value === "object" && "key" in value ? value : null;
      content = choice ? choice.key === "other" ? `Other: ${choice.other ?? ""}` : field.options.find((o) => o.key === choice.key)?.label ?? choice.key : "No answer";
      break;
    }
    case "multi": {
      const multi = value && typeof value === "object" && "keys" in value ? value : null;
      content = multi ? multi.keys.map((key) => key === "other" ? `Other: ${multi.other ?? ""}` : field.options.find((o) => o.key === key)?.label ?? key).join(", ") : "No answer";
      break;
    }
    case "upload": {
      const items = value && typeof value === "object" && "items" in value ? value.items.filter((item): item is SosaUploadItem => "kind" in item) : [];
      content = <div className="flex flex-col gap-2">{items.map((item) => <UploadReadback key={item.id} item={item} slotLabel={field.slots?.find((s) => s.key === item.slot)?.label} />)}</div>;
      break;
    }
    case "list": {
      const items = value && typeof value === "object" && "items" in value ? value.items.filter((item): item is { id: string; values: Record<string, SosaFieldValue> } => "values" in item) : [];
      content = <div className="flex flex-col gap-3">{items.map((item, i) => <div key={item.id} className="rounded-lg bg-surface-raised p-4 flex flex-col gap-3">
        <h5 className="text-sm font-medium">{field.itemLabel} {i + 1}</h5>
        {field.itemFields.map((sub) => <FieldReadback key={sub.key} field={sub} value={item.values[sub.key]} path={`${path}.${item.id}.${sub.key}`} question={question} answer={answer} answers={answers} currency={currency} />)}
      </div>)}</div>;
      break;
    }
  }
  return <div className="flex flex-col gap-1 min-w-0 text-sm text-ink">
    {field.label && <div className="text-xs text-ink-muted">{field.label}</div>}
    {content}
  </div>;
}

/** One read-only question presentation shared by section and SOP views. */
export function SosaQuestionReadback({ question, answers, submittedAt, currency }: {
  question: SosaQuestion; answers: Answers; submittedAt: string | null; currency: CurrencyCode | null;
}) {
  const answer = answers[question.id];
  return <article className="flex flex-col gap-3 min-w-0">
    <h4 className="text-sm font-medium text-ink">{question.number} · {question.prompt}</h4>
    {answer?.marker ? <span className="w-fit rounded-md bg-surface-raised px-2 py-1 text-xs text-ink">{MARKER_LABELS[answer.marker]}</span>
      : !answer || !isQuestionAnswered(question, answers) ? <p className="text-sm text-ink-muted">No answer</p>
        : question.fields.map((field) => <FieldReadback key={field.key} field={field} value={answer.value[field.key]} path={field.key} question={question} answer={answer} answers={answers} currency={currency} />)}
    {isEditedAfterSubmit(answer, submittedAt) && answer && <span className="w-fit rounded-md bg-surface-raised px-2 py-1 text-xs text-ink-muted">Edited after submit · {formatSosaReviewDate(answer.updatedAt)}</span>}
  </article>;
}
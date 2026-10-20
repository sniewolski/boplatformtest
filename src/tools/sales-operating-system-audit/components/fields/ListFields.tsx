/**
 * List and linked field controls for the Sales Operating System Audit.
 * Sub-fields reuse the existing controls in ./Fields. Every write goes through
 * the question's setter or updateSosaAnswer (the single write path).
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { SosaField, SosaQuestion } from "../../config/questionBank";
import type { SosaFieldValue } from "../../types";
import { updateSosaAnswer, useSosaAnswers, type SosaAnswerApi } from "../../data/sosaAnswers";
import {
  getLinkedFieldsForSource,
  getLinkedRows,
  getQuestion,
  hasValue,
  linkedSourceHasValue,
  type Answers,
} from "../../engine/rules";
import { ChoiceField, NumberField, ScriptField, TextField, type ChoiceValue } from "./Fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ListField = Extract<SosaField, { type: "list" }>;
type LinkedField = Extract<SosaField, { type: "linked" }>;
type ListItem = { id: string; values: Record<string, SosaFieldValue> };
type Rows = Record<string, Record<string, SosaFieldValue>>;

const iconBtn =
  "inline-flex items-center justify-center size-8 rounded-md text-ink-muted hover:text-ink hover:bg-[var(--surface-raised)] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// ───────── Sub-field (inside a list item or linked row) ─────────

function SubField({
  field,
  value,
  onChange,
  estimate,
  onEstimateChange,
}: {
  field: SosaField;
  value: SosaFieldValue | undefined;
  onChange: (v: SosaFieldValue | undefined) => void;
  estimate: boolean;
  onEstimateChange: (on: boolean) => void;
}) {
  let control: React.ReactNode;
  switch (field.type) {
    case "number":
      control = (
        <NumberField
          unit={field.unit}
          label={field.label}
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
          estimate={estimate}
          onEstimateChange={onEstimateChange}
        />
      );
      break;
    case "text":
      control = <TextField label={field.label} value={typeof value === "string" ? value : undefined} onChange={onChange} />;
      break;
    case "script":
      control = <ScriptField label={field.label} value={typeof value === "string" ? value : undefined} onChange={onChange} />;
      break;
    case "choice":
      control = (
        <ChoiceField options={field.options} allowOther={field.allowOther} value={value as ChoiceValue} onChange={onChange} />
      );
      break;
    default:
      control = <p className="text-ink-muted text-sm">Coming in a later phase</p>;
  }
  return (
    <div className="flex flex-col gap-2 min-w-0">
      {field.label && <span className="text-sm text-ink">{field.label}</span>}
      {control}
    </div>
  );
}

// ───────── Delete cascade ─────────

function withoutPrefix(est: Record<string, true>, prefix: string): Record<string, true> {
  const out: Record<string, true> = {};
  for (const k of Object.keys(est)) if (!k.startsWith(prefix)) out[k] = true;
  return out;
}

/**
 * Delete one list item and cascade into every linked field sourced from this list.
 *  a) remove the item + estimate paths "<listKey>.<itemId>." on this question
 *  b) for each linked field: remove rows[itemId] + estimate paths "<linkedKey>.<itemId>."
 */
export function deleteSosaListItem(questionId: string, listKey: string, itemId: string) {
  updateSosaAnswer(questionId, (prev) => {
    const cur = prev.value[listKey];
    const items = cur && typeof cur === "object" && "items" in cur ? (cur.items as ListItem[]) : [];
    return {
      ...prev,
      value: { ...prev.value, [listKey]: { items: items.filter((i) => i.id !== itemId) } as SosaFieldValue },
      estimates: withoutPrefix(prev.estimates, `${listKey}.${itemId}.`),
    };
  });
  for (const { question, field } of getLinkedFieldsForSource(questionId, listKey)) {
    updateSosaAnswer(question.id, (prev) => {
      const cur = prev.value[field.key];
      const rows: Rows = cur && typeof cur === "object" && "rows" in cur ? { ...cur.rows } : {};
      delete rows[itemId];
      return {
        ...prev,
        value: { ...prev.value, [field.key]: { rows } as SosaFieldValue },
        estimates: withoutPrefix(prev.estimates, `${field.key}.${itemId}.`),
      };
    });
  }
}

function linkedQuestionsWithRow(questionId: string, listKey: string, itemId: string, answers: Answers) {
  const linked = getLinkedFieldsForSource(questionId, listKey);
  const hasRow = linked.some(({ question, field }) => {
    const v = answers[question.id]?.value[field.key];
    return !!v && typeof v === "object" && "rows" in v && itemId in v.rows;
  });
  return { numbers: [...new Set(linked.map((l) => l.question.number))], hasRow };
}

// ───────── ListField ─────────

export function ListFieldControl({
  question,
  field,
  api,
}: {
  question: SosaQuestion;
  field: ListField;
  api: SosaAnswerApi;
}) {
  const { answers = {} } = useSosaAnswers();
  const { answer, setFieldValue, setEstimate } = api;
  const raw = answer.value[field.key];
  const items: ListItem[] = raw && typeof raw === "object" && "items" in raw ? (raw.items as ListItem[]) : [];
  const [pending, setPending] = useState<{ id: string; label: string; numbers: string[] } | null>(null);

  const setItems = (next: ListItem[]) => setFieldValue(field.key, { items: next } as SosaFieldValue);

  const setSub = (itemId: string, subKey: string, v: SosaFieldValue | undefined) =>
    setItems(
      items.map((it) => {
        if (it.id !== itemId) return it;
        const values = { ...it.values };
        if (v === undefined) delete values[subKey];
        else values[subKey] = v;
        return { ...it, values };
      }),
    );

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  const add = () => setItems([...items, { id: crypto.randomUUID(), values: {} }]);

  const itemLabel = (it: ListItem, i: number) => {
    const first = field.itemFields[0] ? it.values[field.itemFields[0].key] : undefined;
    return typeof first === "string" && first.trim() !== "" ? first : `${field.itemLabel} ${i + 1}`;
  };

  const requestDelete = (it: ListItem, i: number) => {
    const hasItemValue = Object.values(it.values ?? {}).some((x) => hasValue(x));
    const { numbers, hasRow } = linkedQuestionsWithRow(question.id, field.key, it.id, answers);
    if (!hasItemValue && !hasRow) return deleteSosaListItem(question.id, field.key, it.id);
    setPending({ id: it.id, label: itemLabel(it, i), numbers });
  };

  const atMax = field.maxItems !== undefined && items.length >= field.maxItems;

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-sm text-ink-muted">No {field.itemLabel.toLowerCase()}s added yet.</p>}
      {items.map((it, i) => (
        <div key={it.id} className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-ink font-medium">
              {field.itemLabel} {i + 1}
            </span>
            <div className="flex items-center gap-1">
              {field.reorderable && (
                <>
                  <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${field.itemLabel} ${i + 1} up`}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" className={iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${field.itemLabel} ${i + 1} down`}>
                    <ArrowDown className="size-4" />
                  </button>
                </>
              )}
              <button type="button" className={iconBtn} onClick={() => requestDelete(it, i)} aria-label={`Delete ${field.itemLabel} ${i + 1}`}>
                <X className="size-4" />
              </button>
            </div>
          </div>
          {field.itemFields.map((sf) => {
            const path = `${field.key}.${it.id}.${sf.key}`;
            return (
              <SubField
                key={sf.key}
                field={sf}
                value={it.values[sf.key]}
                onChange={(v) => setSub(it.id, sf.key, v)}
                estimate={!!answer.estimates[path]}
                onEstimateChange={(on) => setEstimate(path, on)}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-4">
        {!atMax && (
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="size-4" /> Add {field.itemLabel}
          </Button>
        )}
        {field.maxItems !== undefined && (
          <span className="text-xs text-ink-muted tabular-nums">
            {items.length} of {field.maxItems}
          </span>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pending?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && pending.numbers.length > 0
                ? `Its answers in ${pending.numbers.join(", ")} will be deleted too.`
                : "Its answers will be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) deleteSosaListItem(question.id, field.key, pending.id);
                setPending(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ───────── LinkedField ─────────

export function LinkedFieldControl({
  field,
  api,
}: {
  field: LinkedField;
  api: SosaAnswerApi;
}) {
  const { answers = {} } = useSosaAnswers();
  const { answer, setFieldValue, setEstimate } = api;
  const srcQ = getQuestion(field.source.question);

  if (!linkedSourceHasValue(field, answers)) {
    const target = `q-${field.source.question}`;
    return (
      <p className="text-sm text-ink-muted">
        Answer{" "}
        <a
          href={`#${target}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="text-ink underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {srcQ?.number ?? field.source.question}
        </a>{" "}
        first.
      </p>
    );
  }

  const rows = getLinkedRows(field, answers);
  if (rows.length === 0) return <p className="text-sm text-ink-muted">Nothing to answer here.</p>;

  const raw = answer.value[field.key];
  const data: Rows = raw && typeof raw === "object" && "rows" in raw ? raw.rows : {};

  const setCell = (rowKey: string, subKey: string, v: SosaFieldValue | undefined) => {
    const nextRows: Rows = { ...data };
    const row = { ...(nextRows[rowKey] ?? {}) };
    if (v === undefined) delete row[subKey];
    else row[subKey] = v;
    if (Object.keys(row).length === 0) delete nextRows[rowKey];
    else nextRows[rowKey] = row;
    setFieldValue(field.key, { rows: nextRows } as SosaFieldValue);
  };

  const inline = field.rowFields.length <= 2;

  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((r) => (
        <div
          key={r.rowKey}
          className={`py-4 first:pt-0 grid gap-4 ${
            inline ? "md:grid-cols-[minmax(160px,220px)_minmax(0,1fr)] md:items-start" : ""
          }`}
        >
          <span className="text-sm text-ink font-semibold md:pt-2">{r.label}</span>
          <div className={inline ? "flex flex-col gap-4 md:flex-row md:flex-wrap" : "grid gap-4 md:grid-cols-2"}>
            {field.rowFields.map((sf) => {
              const path = `${field.key}.${r.rowKey}.${sf.key}`;
              return (
                <SubField
                  key={sf.key}
                  field={sf}
                  value={data[r.rowKey]?.[sf.key]}
                  onChange={(v) => setCell(r.rowKey, sf.key, v)}
                  estimate={!!answer.estimates[path]}
                  onEstimateChange={(on) => setEstimate(path, on)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


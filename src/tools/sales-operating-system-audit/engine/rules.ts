/**
 * Pure rules engine for the Sales Operating System Audit. No React, no backend.
 * Implements the VISIBILITY and COMPLETION rules in config/questionBank.ts.
 */
import {
  QUESTIONS,
  SCREENING,
  SECTIONS,
  SKIP_RULES,
  type SosaCondition,
  type SosaField,
  type SosaQuestion,
  type SosaSection,
} from "../config/questionBank";
import type { SosaAnswer, SosaFieldValue } from "../types";

export type Answers = Record<string, SosaAnswer>;

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): SosaQuestion | undefined {
  return QUESTION_BY_ID.get(id);
}

/** "No value": missing, "", empty multi/list/upload. */
export function hasValue(v: SosaFieldValue | undefined | null): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return v !== "";
  if ("keys" in v) return v.keys.length > 0;
  if ("items" in v) return v.items.length > 0;
  if ("key" in v) return !!v.key;
  if ("rows" in v) return Object.keys(v.rows).length > 0;
  return false;
}

function comparable(v: SosaFieldValue): string | number | undefined {
  if (typeof v === "number" || typeof v === "string") return v;
  if ("key" in v) return v.key;
  return undefined;
}

function equals(v: SosaFieldValue, target: string | number): boolean {
  const c = comparable(v);
  if (c === undefined) return false;
  if (typeof target === "number" || typeof c === "number") {
    const n = typeof c === "number" ? c : Number(c);
    return Number.isFinite(n) && n === Number(target);
  }
  return c === target;
}

export function evaluateCondition(
  cond: SosaCondition,
  answers: Answers,
  selfQuestionId?: string,
): boolean {
  if ("all" in cond) return cond.all.every((c) => evaluateCondition(c, answers, selfQuestionId));
  if ("any" in cond) return cond.any.some((c) => evaluateCondition(c, answers, selfQuestionId));

  const qid = cond.question ?? selfQuestionId;
  if (!qid) return false;
  const a = answers[qid];
  if (!a || a.marker) return false;
  const v = a.value[cond.field];
  if (!hasValue(v)) return false;

  if (cond.eq !== undefined) return equals(v, cond.eq);
  if (cond.notEq !== undefined) return !equals(v, cond.notEq);
  if (cond.in !== undefined) return cond.in.some((t) => equals(v, t));
  if (cond.includes !== undefined || cond.excludes !== undefined) {
    if (typeof v !== "object" || !("keys" in v)) return false;
    if (cond.includes !== undefined) return v.keys.includes(cond.includes);
    return !v.keys.includes(cond.excludes!);
  }
  return false;
}

export function getHiddenQuestionIds(answers: Answers): Set<string> {
  const hidden = new Set<string>();
  for (const rule of SKIP_RULES) {
    if (!evaluateCondition(rule.when, answers)) continue;
    for (const target of rule.hide) {
      if (target.startsWith("section:")) {
        const n = Number(target.slice("section:".length));
        for (const q of QUESTIONS) if (q.section === n) hidden.add(q.id);
      } else {
        hidden.add(target);
      }
    }
  }
  return hidden;
}

export function isQuestionVisible(
  question: SosaQuestion,
  answers: Answers,
  hidden: Set<string> = getHiddenQuestionIds(answers),
): boolean {
  return !question.screeningOnly && !hidden.has(question.id);
}

export function isFieldVisible(
  field: SosaField,
  _answer: SosaAnswer | undefined,
  questionId: string,
  answers: Answers,
): boolean {
  return !field.showWhen || evaluateCondition(field.showWhen, answers, questionId);
}

export function getVisibleQuestions(sectionNumber: number, answers: Answers, hidden = getHiddenQuestionIds(answers)) {
  return QUESTIONS.filter((q) => q.section === sectionNumber && isQuestionVisible(q, answers, hidden));
}

export function getVisibleSections(answers: Answers): SosaSection[] {
  const hidden = getHiddenQuestionIds(answers);
  return SECTIONS.filter((s) => getVisibleQuestions(s.number, answers, hidden).length > 0);
}

export type LinkedRow = { rowKey: string; label: string };

export function getLinkedRows(
  linkedField: Extract<SosaField, { type: "linked" }>,
  answers: Answers,
): LinkedRow[] {
  const srcQ = getQuestion(linkedField.source.question);
  const srcField = srcQ?.fields.find((f) => f.key === linkedField.source.field);
  if (!srcField) return [];
  const v = answers[linkedField.source.question]?.value[linkedField.source.field];
  const exclude = new Set(linkedField.excludeOptions ?? []);

  if (srcField.type === "list") {
    const items = v && typeof v === "object" && "items" in v ? (v.items as { id: string; values: Record<string, SosaFieldValue> }[]) : [];
    const firstKey = srcField.itemFields[0]?.key;
    let rows = items.map((item, i) => {
      const first = firstKey ? item.values?.[firstKey] : undefined;
      const label = typeof first === "string" && first.trim() !== "" ? first : `${srcField.itemLabel} ${i + 1}`;
      return { rowKey: item.id, label };
    });
    if (linkedField.skipLastItem) rows = rows.slice(0, -1);
    return rows;
  }

  if (srcField.type === "multi") {
    if (!v || typeof v !== "object" || !("keys" in v)) return [];
    const rows: LinkedRow[] = srcField.options
      .filter((o) => v.keys.includes(o.key) && !exclude.has(o.key))
      .map((o) => ({ rowKey: o.key, label: o.label }));
    if (v.keys.includes("other") && !exclude.has("other")) {
      rows.push({ rowKey: "other", label: v.other?.trim() || "Other" });
    }
    return rows;
  }
  return [];
}

/** Linked source field has a value (no marker, source question visible). */
export function linkedSourceHasValue(
  linkedField: Extract<SosaField, { type: "linked" }>,
  answers: Answers,
): boolean {
  const srcQ = getQuestion(linkedField.source.question);
  if (!srcQ || !isQuestionVisible(srcQ, answers)) return false;
  const a = answers[linkedField.source.question];
  if (!a || a.marker) return false;
  return hasValue(a.value[linkedField.source.field]);
}

/** Every linked field (with its question) whose source is the given list/multi field. */
export function getLinkedFieldsForSource(questionId: string, fieldKey: string) {
  const out: { question: SosaQuestion; field: Extract<SosaField, { type: "linked" }> }[] = [];
  for (const q of QUESTIONS) {
    for (const f of q.fields) {
      if (f.type === "linked" && f.source.question === questionId && f.source.field === fieldKey) {
        out.push({ question: q, field: f });
      }
    }
  }
  return out;
}

function fieldAnswered(field: SosaField, v: SosaFieldValue | undefined, answers: Answers): boolean {
  switch (field.type) {
    case "number":
      return typeof v === "number" && Number.isFinite(v);
    case "text":
    case "script":
      return typeof v === "string" && v.trim() !== "";
    case "yesno":
      return v === "yes" || v === "no";
    case "choice":
      if (!v || typeof v !== "object" || !("key" in v) || !v.key) return false;
      return v.key !== "other" || !!v.other?.trim();
    case "multi":
      if (!v || typeof v !== "object" || !("keys" in v) || v.keys.length === 0) return false;
      if (v.keys.length === 1 && v.keys[0] === "other") return !!v.other?.trim();
      return true;
    case "upload":
      return !!v && typeof v === "object" && "items" in v && v.items.length > 0;
    case "list": {
      if (!v || typeof v !== "object" || !("items" in v)) return false;
      const items = v.items as { id: string; values?: Record<string, SosaFieldValue> }[];
      return items.some((it) => Object.values(it.values ?? {}).some((x) => hasValue(x)));
    }
    case "linked": {
      if (!linkedSourceHasValue(field, answers)) return false;
      const rows = getLinkedRows(field, answers);
      if (rows.length === 0) return true;
      const first = field.rowFields[0];
      const data = v && typeof v === "object" && "rows" in v ? v.rows : {};
      return rows.every((r) => !!first && hasValue(data[r.rowKey]?.[first.key]));
    }
  }
}

export function isQuestionAnswered(question: SosaQuestion, answers: Answers): boolean {
  const a = answers[question.id];
  if (a?.marker) return true;
  const first = question.fields[0];
  if (!first) return false;
  return fieldAnswered(first, a?.value[first.key], answers);
}

export function getSectionProgress(sectionNumber: number, answers: Answers) {
  const qs = getVisibleQuestions(sectionNumber, answers);
  return { answered: qs.filter((q) => isQuestionAnswered(q, answers)).length, total: qs.length };
}

export function getOverallProgress(answers: Answers) {
  const hidden = getHiddenQuestionIds(answers);
  const qs = QUESTIONS.filter((q) => isQuestionVisible(q, answers, hidden));
  return { answered: qs.filter((q) => isQuestionAnswered(q, answers)).length, total: qs.length };
}

export function isScreeningComplete(answers: Answers): boolean {
  return SCREENING.every((item) => {
    const firstKey = item.fields[0];
    return !!firstKey && hasValue(answers[item.questionId]?.value[firstKey]);
  });
}

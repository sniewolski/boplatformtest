import { test, expect } from "vitest";
import { getHiddenQuestionIds, isScreeningComplete, getOverallProgress, evaluateCondition } from "@/tools/sales-operating-system-audit/engine/rules";
const a = (qid: string, value: any, marker: any = null) => ({ [qid]: { questionId: qid, value, estimates: {}, marker, updatedAt: "" } });
test("rules", () => {
  expect(getHiddenQuestionIds({}).size).toBe(0);
  expect(getOverallProgress({}).total).toBe(272);
  const h = getHiddenQuestionIds(a("q0_1", { answer: { key: "just_me" } }));
  expect(h.has("q1_14")).toBe(true);
  expect(getHiddenQuestionIds(a("q1_2", { recurring: 0 })).has("q14_3")).toBe(true);
  expect(getHiddenQuestionIds(a("q0_1", { answer: { key: "just_me" } }, "dont_know")).size).toBe(0);
  expect(evaluateCondition({ question: "q5_4", field: "channels", excludes: "phone" }, a("q5_4", { channels: { keys: [] } }))).toBe(false);
  expect(isScreeningComplete({})).toBe(false);
});

import { isQuestionAnswered, getQuestion, getLinkedRows, getLinkedFieldsForSource } from "@/tools/sales-operating-system-audit/engine/rules";
test("list answered needs a non-empty item", () => {
  const q = getQuestion("q8_1")!;
  const key = q.fields[0].key;
  expect(isQuestionAnswered(q, a("q8_1", { [key]: { items: [{ id: "x", values: {} }] } }))).toBe(false);
  expect(isQuestionAnswered(q, a("q8_1", { [key]: { items: [{ id: "x", values: { [(q.fields[0] as any).itemFields[0].key]: "Lead" } }] } }))).toBe(true);
});
test("linked answered rules", () => {
  const src = getQuestion("q8_1")!;
  const key = src.fields[0].key;
  const linked = getLinkedFieldsForSource("q8_1", key).find((l) => (l.field as any).skipLastItem)!;
  expect(linked).toBeTruthy();
  // no source value → false
  expect(isQuestionAnswered(linked.question, {})).toBe(false);
  // one blank stage with skipLastItem → no rows but source has value → true
  const one = a("q8_1", { [key]: { items: [{ id: "s1", values: { x: "y" } }] } });
  expect(getLinkedRows(linked.field, one)).toEqual([]);
  expect(isQuestionAnswered(linked.question, one)).toBe(true);
  // two items, blank second gets labelled fallback row; first row unanswered → false
  const two = a("q8_1", { [key]: { items: [{ id: "s1", values: {} }, { id: "s2", values: {} }, { id: "s3", values: {} }] } });
  const rows = getLinkedRows(linked.field, two);
  expect(rows.map((r) => r.rowKey)).toEqual(["s1", "s2"]);
  expect(rows[1].label.endsWith(" 2")).toBe(true);
  expect(isQuestionAnswered(linked.question, two)).toBe(false);
});

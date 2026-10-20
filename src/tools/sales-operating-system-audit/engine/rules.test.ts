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

import { expect, test } from "vitest";
import { getSosaReviewStatus } from "./adminReview";
import type { Answers } from "./rules";

const submittedAt = "2026-10-20T10:00:00Z";
function answer(questionId: string, updatedAt = "2026-10-20T09:00:00Z") {
  return { questionId, value: {}, estimates: {}, marker: "dont_know" as const, updatedAt };
}

test("no answer rows and no submission is not started", () => {
  expect(getSosaReviewStatus({}, null).state).toBe("not_started");
});
test("answer rows without a submission are in progress with rounded visible progress", () => {
  const status = getSosaReviewStatus({ q1_1: answer("q1_1") }, null);
  expect(status.state).toBe("in_progress");
  expect(status.answered).toBe(1);
  expect(status.total).toBe(272);
  expect(status.percent).toBe(0);
});
test("a submission without a later visible edit is submitted", () => {
  expect(getSosaReviewStatus({ q1_1: answer("q1_1", submittedAt) }, submittedAt).state).toBe("submitted");
});
test("a later visible answer marks the audit edited after submit", () => {
  expect(getSosaReviewStatus({ q1_1: answer("q1_1", "2026-10-20T10:00:01Z") }, submittedAt).state).toBe("edited");
});
test("hidden and screening-only later edits do not mark submitted audits edited", () => {
  const answers: Answers = {
    q0_1: { ...answer("q0_1", "2026-10-20T11:00:00Z"), marker: null, value: { answer: { key: "just_me" } } },
    q1_14: answer("q1_14", "2026-10-20T11:00:00Z"),
  };
  expect(getSosaReviewStatus(answers, submittedAt).state).toBe("submitted");
});
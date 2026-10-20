import { QUESTIONS } from "../config/questionBank";
import { getOverallProgress, isEditedAfterSubmit, isQuestionVisible } from "./rules";
import type { Answers } from "./rules";
import type { SosaAnswer } from "../types";

export type SosaReviewStatus = {
  state: "not_started" | "in_progress" | "submitted" | "edited";
  answered: number;
  total: number;
  percent: number;
  submittedAt: string | null;
};

export function getSosaReviewStatus(answers: Answers, submittedAt: string | null): SosaReviewStatus {
  const { answered, total } = getOverallProgress(answers);
  const edited = !!submittedAt && QUESTIONS.some((q) =>
    isQuestionVisible(q, answers) && isEditedAfterSubmit(answers[q.id], submittedAt),
  );
  return {
    state: submittedAt ? (edited ? "edited" : "submitted") : Object.keys(answers).length ? "in_progress" : "not_started",
    answered,
    total,
    percent: total ? Math.round(answered / total * 100) : 0,
    submittedAt,
  };
}

export function formatSosaReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function sosaReviewStatusLabel(status: SosaReviewStatus): string {
  switch (status.state) {
    case "not_started": return "Not started";
    case "in_progress": return `In progress · ${status.percent}%`;
    case "submitted": return `Submitted · ${status.submittedAt ? formatSosaReviewDate(status.submittedAt) : ""}`;
    case "edited": return "Edited after submit";
  }
}

export function sosaAnswerFromRow(row: {
  question_id: string; value: unknown; estimates: unknown; marker: unknown; updated_at: string;
}): SosaAnswer {
  return {
    questionId: row.question_id,
    value: (row.value ?? {}) as SosaAnswer["value"],
    estimates: (row.estimates ?? {}) as SosaAnswer["estimates"],
    marker: row.marker === "dont_know" || row.marker === "not_doing" || row.marker === "dont_have" ? row.marker : null,
    updatedAt: row.updated_at,
  };
}
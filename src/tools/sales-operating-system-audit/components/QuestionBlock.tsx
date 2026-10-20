import { Check } from "lucide-react";
import type { SosaQuestion } from "../config/questionBank";
import type { SosaMarker } from "../types";
import { useSosaAnswer, useSosaAnswers } from "../data/sosaAnswers";
import { isQuestionAnswered } from "../engine/rules";
import { FieldRenderer } from "./fields/FieldRenderer";

const MARKERS: Record<SosaQuestion["markers"], { key: SosaMarker; label: string }[]> = {
  standard: [
    { key: "dont_know", label: "Don't know" },
    { key: "not_doing", label: "We don't do this" },
  ],
  upload: [{ key: "dont_have", label: "We don't have this" }],
};

/** Normalize for label-vs-prompt comparison: ignore case, spaces and punctuation. */
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** One question: number, prompt, hint, fields (dimmed/disabled under a marker) and marker toggles. */
export function QuestionBlock({ question }: { question: SosaQuestion }) {
  const api = useSosaAnswer(question.id);
  const { answers = {} } = useSosaAnswers();
  const answered = isQuestionAnswered(question, answers);
  const marker = api.answer.marker;

  return (
    <section id={`q-${question.id}`} className="flex flex-col gap-3 scroll-mt-6" aria-labelledby={`qh-${question.id}`}>
      <div className="flex flex-col gap-1">
        <h3 id={`qh-${question.id}`} className="text-base text-ink font-medium flex items-baseline gap-2">
          <span className="text-ink-muted tabular-nums font-normal inline-flex items-center gap-1 shrink-0">
            {question.number}
            {answered && <Check className="size-3.5 text-ink" aria-label="Answered" />}
          </span>
          <span>{question.prompt}</span>
        </h3>
        {question.hint && <p className="text-sm text-ink-muted">{question.hint}</p>}
      </div>

      <fieldset
        disabled={!!marker}
        aria-disabled={!!marker}
        className={`flex flex-col gap-4 border-0 p-0 m-0 min-w-0 ${marker ? "opacity-50" : ""}`}
      >
        {question.fields.map((f) => (
          <FieldRenderer
            key={f.key}
            question={question}
            field={f}
            api={api}
            hideLabel={!!f.label && normalize(f.label) === normalize(question.prompt)}
          />
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        {MARKERS[question.markers].map((m) => {
          const active = marker === m.key;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={active}
              onClick={() => api.setMarker(active ? null : m.key)}
              className={`text-xs rounded-full border px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-ink bg-[var(--surface-raised)] text-ink"
                  : "border-border text-ink-muted hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

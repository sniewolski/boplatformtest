import { Link } from "@tanstack/react-router";
import { SECTIONS, type SosaQuestion } from "../config/questionBank";
import { useSosaAnswers } from "../data/sosaAnswers";
import { getVisibleQuestions, getVisibleSections } from "../engine/rules";
import { QuestionBlock } from "../components/QuestionBlock";
import { Button } from "@/components/ui/button";
import { SubmitArea } from "../components/SubmitArea";

const KEY = "sales-operating-system-audit";

export function SectionPage({ number }: { number: number }) {
  const { answers = {} } = useSosaAnswers();
  const section = SECTIONS.find((s) => s.number === number)!;
  const questions = getVisibleQuestions(number, answers);

  const ungrouped: SosaQuestion[] = [];
  const groups = new Map<string, SosaQuestion[]>();
  for (const q of questions) {
    if (!q.group) ungrouped.push(q);
    else groups.set(q.group, [...(groups.get(q.group) ?? []), q]);
  }

  const visible = getVisibleSections(answers);
  const idx = visible.findIndex((s) => s.number === number);
  const prev = idx > 0 ? `section/${visible[idx - 1].number}` : "screening";
  const next = idx >= 0 && idx < visible.length - 1 ? `section/${visible[idx + 1].number}` : null;

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <h2 className="text-xl text-ink">
          {section.number}. {section.title}
        </h2>
        <p className="text-ink-muted text-sm max-w-prose">{section.intro}</p>
        {section.note && (
          <p className="text-sm text-ink rounded-lg bg-[var(--surface-raised)] px-4 py-3 max-w-prose">
            {section.note}
          </p>
        )}
      </header>

      {ungrouped.length > 0 && (
        <div className="flex flex-col gap-12 -mt-2">
          {ungrouped.map((q) => (
            <QuestionBlock key={q.id} question={q} />
          ))}
        </div>
      )}

      {[...groups.entries()].map(([g, qs]) => (
        <div key={g} className="flex flex-col gap-12 mt-2">
          <h3 className="text-base text-ink font-medium -mb-6">{g}</h3>
          {qs.map((q) => (
            <QuestionBlock key={q.id} question={q} />
          ))}
        </div>
      ))}

      <div className="flex items-start justify-between gap-4">
        <Button asChild variant="outline">
          <Link to="/app/tools/$key/$" params={{ key: KEY, _splat: prev }}>
            Previous
          </Link>
        </Button>
        {next ? (
          <Button asChild>
            <Link to="/app/tools/$key/$" params={{ key: KEY, _splat: next }}>
              Next
            </Link>
          </Button>
        ) : (
          <SubmitArea />
        )}
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { SCREENING, type SosaScreeningItem } from "../config/questionBank";
import { useSosaAnswer, useSosaAnswers } from "../data/sosaAnswers";
import { getQuestion, isScreeningComplete } from "../engine/rules";
import { FieldRenderer } from "../components/fields/FieldRenderer";
import { Button } from "@/components/ui/button";

function ScreeningItem({ item }: { item: SosaScreeningItem }) {
  const api = useSosaAnswer(item.questionId);
  const question = getQuestion(item.questionId);
  if (!question) return null;
  const fields = item.fields
    .map((k) => question.fields.find((f) => f.key === k))
    .filter((f): f is NonNullable<typeof f> => !!f);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base text-ink font-medium">{item.prompt}</h3>
      {fields.map((f) => (
        <FieldRenderer key={f.key} question={question} field={f} api={api} />
      ))}
    </section>
  );
}

export function Screening() {
  const { answers } = useSosaAnswers();
  const complete = isScreeningComplete(answers ?? {});
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl text-ink">Before you start</h2>
        <p className="text-ink-muted text-sm">
          A few quick questions so you only see what applies to your business.
        </p>
      </header>
      <div className="flex flex-col gap-8">
        {SCREENING.map((item) => (
          <ScreeningItem key={item.questionId} item={item} />
        ))}
      </div>
      <div>
        {complete ? (
          <Button asChild>
            <Link to="/app/tools/$key/$" params={{ key: "sales-operating-system-audit", _splat: "" }}>
              Continue
            </Link>
          </Button>
        ) : (
          <Button disabled>Continue</Button>
        )}
      </div>
    </div>
  );
}

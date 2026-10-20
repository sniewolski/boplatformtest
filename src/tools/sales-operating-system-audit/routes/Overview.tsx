import { Link } from "@tanstack/react-router";
import { QUESTIONS, SECTIONS } from "../config/questionBank";
import { useSosaAnswers } from "../data/sosaAnswers";
import { getOverallProgress, getSectionProgress } from "../engine/rules";
import { PageHeader } from "../components/PageHeader";

/** Temporary overview — replaced in Phase 3. */
export function Overview() {
  const { answers = {} } = useSosaAnswers();
  const allCount = QUESTIONS.filter((q) => !q.screeningOnly).length;
  const overall = getOverallProgress(answers);
  return (
    <div className="app-content py-12 flex flex-col gap-8">
      <PageHeader title="Sales Operating System Audit">
        <p className="text-ink-muted text-sm">
          Visible questions: {overall.total} of {allCount}
        </p>
      </PageHeader>
      <ul className="flex flex-col divide-y divide-border list-none">
        {SECTIONS.map((s) => {
          const p = getSectionProgress(s.number, answers);
          return (
            <li key={s.number} className="flex items-center gap-4 py-3 text-sm">
              <span className="w-8 text-ink-muted tabular-nums">{s.number}</span>
              <span className="flex-1 text-ink">{s.title}</span>
              {p.total === 0 ? (
                <span className="text-ink-muted">Hidden</span>
              ) : (
                <span className="text-ink-muted tabular-nums">
                  {p.answered} answered · {p.total} visible
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <Link
        to="/app/tools/$key/$"
        params={{ key: "sales-operating-system-audit", _splat: "screening" }}
        className="text-sm text-ink underline underline-offset-2 self-start rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to screening questions
      </Link>
    </div>
  );
}

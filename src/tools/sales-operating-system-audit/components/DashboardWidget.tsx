import { Link } from "@tanstack/react-router";
import { useSosaAnswers } from "../data/sosaAnswers";
import { useSosaSubmission, formatSosaDate } from "../data/sosaSubmission";
import { getOverallProgress } from "../engine/rules";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

export function DashboardWidget() {
  const { data: answers } = useSosaAnswers();
  const { submittedAt } = useSosaSubmission();
  const { answered, total } = getOverallProgress(answers ?? {});

  let figure: string;
  let caption: string;
  if (submittedAt) {
    figure = "Submitted";
    caption = formatSosaDate(submittedAt);
  } else if (answered === 0) {
    figure = "Not started";
    caption = "About 200 questions";
  } else {
    figure = `${Math.round((answered / total) * 100)}%`;
    caption = `${answered} of ${total} answered`;
  }

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "sales-operating-system-audit", _splat: "" }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Sales OS Audit
      </span>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
        <span
          className="text-ink text-2xl font-medium"
          style={{ letterSpacing: "-0.01em" }}
        >
          {figure}
        </span>
        <span className="text-ink-muted text-sm">{caption}</span>
      </div>
    </Link>
  );
}

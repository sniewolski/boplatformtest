import { Link } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { useConversionIntake } from "../data/useConversionReview";

export function DashboardWidget() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake } = useConversionIntake(userId);

  let summary = "Not started — 0 of 4 reviews complete.";
  if (intake?.submitted_at) {
    summary = intake.has_unsubmitted_changes
      ? "Submitted · edits pending re-submission."
      : "Submitted — your coach has what they need.";
  } else if (intake?.draft_answers) {
    summary = "Draft in progress.";
  }

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "selling-systems-audit", _splat: "" }}
      className="block border border-border rounded-xl px-5 py-4 hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-ink font-medium">Selling Systems Audit</span>
      </div>
      <span className="text-ink-muted text-sm tabular-nums">{summary}</span>
    </Link>
  );
}

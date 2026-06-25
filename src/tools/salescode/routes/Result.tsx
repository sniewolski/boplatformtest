import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useSalesCodeIntake } from "../data/useSalesCodeIntake";
import { scoreSalesCode } from "../lib/scoring";
import type { AnswerMap } from "../lib/types";
import { SalesCodeResultView } from "../components/SalesCodeResultView";

/**
 * SalesCode owner result route. Reads the submitted snapshot from the
 * intake row and re-scores it client-side — deterministic and matches what
 * was persisted at submit, but lets the page survive copy edits without a
 * migration. Renders via the shared SalesCodeResultView so the respondent
 * completion screen reuses the exact same layout.
 */
export function SalesCodeResultRoute() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useSalesCodeIntake(userId);

  if (isLoading) {
    return (
      <div className="app-content py-12">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }
  if (!intake?.submitted_answers) {
    return (
      <div className="app-content py-12 flex flex-col gap-4">
        <p className="text-ink-muted">
          No submitted result yet. Complete the assessment to see your SalesCode.
        </p>
        <div>
          <Button asChild variant="outline">
            <Link to="/app/tools/$key/$" params={{ key: "salescode", _splat: "" }}>
              <ArrowLeft className="size-4 mr-2" /> Back
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const answers = intake.submitted_answers as AnswerMap;
  const result = scoreSalesCode(answers);

  return (
    <div className="app-content py-12">
      <SalesCodeResultView
        result={result}
        variant="owner"
        footerSlot={
          <footer className="flex items-center justify-between gap-4 pt-2">
            <Button asChild variant="outline">
              <Link
                to="/app/tools/$key/$"
                params={{ key: "salescode", _splat: "" }}
              >
                <ArrowLeft className="size-4 mr-2" /> Back to overview
              </Link>
            </Button>
            {intake.submitted_at ? (
              <span className="text-xs text-ink-muted">
                Submitted {new Date(intake.submitted_at).toLocaleDateString()}
              </span>
            ) : null}
          </footer>
        }
      />
    </div>
  );
}

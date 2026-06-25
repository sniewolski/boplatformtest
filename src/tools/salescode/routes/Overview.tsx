import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useSalesCodeIntake } from "../data/useSalesCodeIntake";
import { TOTAL_QUESTIONS, PRESENTATION_ORDER } from "../lib/questions";
import type { AnswerMap } from "../lib/types";

/**
 * SalesCode overview — entry point. Shows Start, Resume, or "review your
 * result" depending on what the owner has done. The full result write-up
 * renderer lands in the next phase; for now we display the type code.
 */
export function SalesCodeOverview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useSalesCodeIntake(userId);

  const draft = (intake?.draft_answers ?? {}) as AnswerMap;
  const draftCount = PRESENTATION_ORDER.reduce((n, id) => n + (draft[id] ? 1 : 0), 0);
  const isSubmitted = !!intake?.submitted_at && !intake?.has_unsubmitted_changes;
  const hasDraft = draftCount > 0 && !isSubmitted;

  const ctaLabel = isSubmitted
    ? "Review your result"
    : hasDraft
      ? `Resume (${draftCount}/${TOTAL_QUESTIONS})`
      : "Start assessment";

  return (
    <div className="app-content py-12 flex flex-col gap-6">
      <header className="flex flex-col gap-3 max-w-prose">
        <h1 className="text-2xl text-ink" style={{ letterSpacing: "-0.01em" }}>
          SalesCode
        </h1>
        <p className="text-ink-muted">
          A short self-assessment that returns your four-letter SalesCode
          type and a trait profile across sales skills, inner game, and
          habits &amp; drive. {TOTAL_QUESTIONS} statements; about 15
          minutes; progress saves automatically.
        </p>
      </header>
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl text-ink" style={{ letterSpacing: "-0.01em" }}>
            SalesCode
          </h1>
          <p className="text-ink-muted">
            A short self-assessment that returns your four-letter SalesCode
            type and a trait profile across sales skills, inner game, and
            habits &amp; drive. {TOTAL_QUESTIONS} statements; about 15
            minutes; progress saves automatically.
          </p>
        </header>

        {isSubmitted ? (
          <div className="rounded-md border border-border bg-surface px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-ink-muted uppercase tracking-wide">Your type</span>
              <span className="text-xl font-mono text-ink">{intake?.type_code ?? "—"}</span>
            </div>
            <span className="text-xs text-ink-muted">
              Submitted{" "}
              {intake?.submitted_at
                ? new Date(intake.submitted_at).toLocaleDateString()
                : ""}
            </span>
          </div>
        ) : null}

        <div>
          <Button
            asChild
            disabled={isLoading}
            className="active:scale-[0.97] transition-transform"
          >
            <Link
              to="/app/tools/$key/$"
              params={{
                key: "salescode",
                _splat: isSubmitted ? "result" : "assessment",
              }}
              className="inline-flex items-center gap-2"
            >
              {ctaLabel} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

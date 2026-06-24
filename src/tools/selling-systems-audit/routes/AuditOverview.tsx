import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { AUDIT_SECTIONS } from "../config";
import { useConversionIntake } from "../data/useConversionReview";
import { usePipelineIntake } from "../data/usePipelineReview";
import { useProcessIntake } from "../data/useProcessReview";
import { useActivityIntake } from "../data/useActivityReview";

export function AuditOverview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake } = useConversionIntake(userId);
  const { data: pipelineIntake } = usePipelineIntake(userId);
  const { data: processIntake } = useProcessIntake(userId);

  const conversionSubmitted = !!intake?.submitted_at;
  const conversionHasDraft = !!intake?.draft_answers;
  const pipelineSubmitted = !!pipelineIntake?.submitted_at;
  const processSubmitted = !!processIntake?.submitted_at;

  let conversionStatus: string;
  if (conversionSubmitted) {
    conversionStatus = intake!.has_unsubmitted_changes
      ? "Submitted · edits pending re-submission"
      : "Submitted — your coach has what they need";
  } else if (conversionHasDraft) {
    conversionStatus = "Draft in progress";
  } else {
    conversionStatus = "Not started";
  }

  const completed =
    (conversionSubmitted ? 1 : 0) +
    (pipelineSubmitted ? 1 : 0) +
    (processSubmitted ? 1 : 0);
  const total = AUDIT_SECTIONS.length;

  return (
    <div className="app-content py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Selling Systems Audit
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          A multi-part diagnostic of your selling system.
        </p>
        <p className="text-ink-muted text-sm max-w-prose">
          Work through each section at your own pace — your coach reviews what you submit before your call.
        </p>
        <p className="text-ink-muted text-sm tabular-nums">
          {completed} of {total} reviews complete
        </p>
      </header>

      <ol className="flex flex-col">
        {AUDIT_SECTIONS.map((section, i) => {
          const isLast = i === AUDIT_SECTIONS.length - 1;
          const isConversion = section.key === "conversion";
          const isLocked = section.status === "locked";

          const rowBody = (
            <div
              className={`flex items-start justify-between gap-6 py-5 ${
                isLast ? "" : "border-b border-border"
              } ${isLocked ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-ink font-medium text-base">{section.label}</span>
                  {isLocked && (
                    <Lock className="size-3.5 text-ink-muted shrink-0" aria-hidden />
                  )}
                </div>
                <span className="text-ink-muted text-sm">{section.description}</span>
                {isConversion && (
                  <span className="text-ink-muted text-sm mt-1">{conversionStatus}</span>
                )}
                {isLocked && (
                  <span className="text-ink-muted text-xs mt-1">Available soon</span>
                )}
              </div>
              {!isLocked && (
                <ArrowRight
                  className="size-4 text-ink-muted mt-1 shrink-0"
                  aria-hidden
                />
              )}
            </div>
          );

          if (isLocked) {
            return (
              <li
                key={section.key}
                title="Available soon"
                aria-disabled
                className="cursor-not-allowed select-none"
              >
                {rowBody}
              </li>
            );
          }

          return (
            <li key={section.key}>
              <Link
                to="/app/tools/$key/$"
                params={{ key: "selling-systems-audit", _splat: section.key }}
                className="group block transition-[background-color] duration-[120ms] hover:bg-[var(--surface-raised)] rounded-md -mx-3 px-3"
              >
                {rowBody}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Circle, Lock } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { AUDIT_SECTIONS, type AuditSectionKey } from "../config";
import { useConversionIntake } from "../data/useConversionReview";
import { usePipelineIntake } from "../data/usePipelineReview";
import { useProcessIntake } from "../data/useProcessReview";
import { useActivityIntake } from "../data/useActivityReview";
import { useMessagingIntake } from "../data/useMessagingReview";
import { useAlignmentIntake } from "../data/useAlignmentReview";
import { useContentAssets } from "../content/useContentReview";

export function AuditOverview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake } = useConversionIntake(userId);
  const { data: pipelineIntake } = usePipelineIntake(userId);
  const { data: processIntake } = useProcessIntake(userId);
  const { data: activityIntake } = useActivityIntake(userId);
  const { data: messagingIntake } = useMessagingIntake(userId);
  const { data: alignmentIntake } = useAlignmentIntake(userId);
  const { data: contentAssets } = useContentAssets(userId);

  const submittedByKey: Partial<Record<AuditSectionKey, boolean>> = {
    conversion: !!intake?.submitted_at,
    pipeline: !!pipelineIntake?.submitted_at,
    process: !!processIntake?.submitted_at,
    activity: !!activityIntake?.submitted_at,
    messaging: !!messagingIntake?.submitted_at,
    alignment: !!alignmentIntake?.submitted_at,
  };

  const contentCount = contentAssets?.length ?? 0;

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
      </header>

      <ol className="flex flex-col">
        {AUDIT_SECTIONS.map((section, i) => {
          const isLast = i === AUDIT_SECTIONS.length - 1;
          const isLocked = section.status === "locked";
          const isContent = section.key === "content";
          const submitted = submittedByKey[section.key];

          const indicator = isLocked ? null : isContent ? (
            <div className="flex flex-col items-end shrink-0 min-w-[88px]">
              {contentCount > 0 ? (
                <>
                  <span className="text-2xl text-ink tabular-nums leading-none">
                    {contentCount}
                  </span>
                  <span className="text-xs text-ink-muted mt-1">items submitted</span>
                </>
              ) : (
                <span className="text-sm text-ink-muted">No items yet</span>
              )}
            </div>
          ) : submitted ? (
            <Check
              className="size-6 text-ink shrink-0 mt-0.5"
              strokeWidth={2.5}
              aria-label="Submitted"
            />
          ) : (
            <Circle
              className="size-6 text-ink-muted shrink-0 mt-0.5"
              strokeWidth={1.5}
              aria-label="Not submitted"
            />
          );

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
                {isLocked && (
                  <span className="text-ink-muted text-xs mt-1">Available soon</span>
                )}
              </div>
              {!isLocked && (
                <div className="flex items-center gap-4 shrink-0">
                  {indicator}
                  <ArrowRight
                    className="size-4 text-ink-muted mt-1 shrink-0"
                    aria-hidden
                  />
                </div>
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

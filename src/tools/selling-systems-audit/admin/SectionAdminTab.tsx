import type { ReactNode } from "react";
import type { CurrencyCode } from "@/lib/format-currency";
import {
  useOwnerCurrency,
  useSubmittedAnswers,
  type AdminSectionKey,
} from "./useAdminSection";
import { SectionSummaryPanel } from "./SectionSummaryPanel";
import { SectionNotes } from "./SectionNotes";

/**
 * Generic per-owner section tab — used for Pipeline, Process, Activity,
 * Messaging, Alignment. Conversion uses its own tab file (predates the
 * factory) but follows the same layout 1:1.
 *
 * Top → bottom:
 *   1. Collapsed AI call-prep summary (generate is the only red).
 *   2. Submitted answers, rebuilt 1:1 from the owner-side ReadBack primitives.
 *   3. Private coach notes (admin-only).
 */
export function SectionAdminTab({
  ownerId,
  sectionKey,
  sectionLabel,
  renderReadBack,
}: {
  ownerId: string;
  sectionKey: AdminSectionKey;
  sectionLabel: string;
  renderReadBack: (
    answers: Record<string, unknown>,
    currency: CurrencyCode | null,
  ) => ReactNode;
}) {
  const submitted = useSubmittedAnswers(ownerId, sectionKey);
  const currencyQ = useOwnerCurrency(ownerId);

  const answers = submitted.data?.submitted_answers ?? null;
  const submittedAt = submitted.data?.submitted_at ?? null;
  const hasSubmitted =
    !!submittedAt && !!answers && Object.keys(answers).length > 0;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <SectionSummaryPanel
        ownerId={ownerId}
        sectionKey={sectionKey}
        hasSubmitted={hasSubmitted}
      />

      <section className="flex flex-col gap-4" aria-label="Submitted answers">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg text-ink">Submitted answers</h2>
          {submittedAt ? (
            <span className="text-xs text-ink-muted">
              Submitted {new Date(submittedAt).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-xs text-ink-muted">Not submitted</span>
          )}
        </div>

        {submitted.isLoading && (
          <p className="text-sm text-ink-muted">Loading…</p>
        )}
        {submitted.error && (
          <p className="text-sm text-[var(--red)]">
            {(submitted.error as Error).message}
          </p>
        )}
        {!submitted.isLoading && !hasSubmitted && (
          <div className="border border-border rounded-xl px-5 py-8 text-sm text-ink-muted">
            This owner hasn't submitted the {sectionLabel} section yet.
          </div>
        )}
        {hasSubmitted &&
          answers &&
          renderReadBack(
            answers as Record<string, unknown>,
            currencyQ.data ?? null,
          )}
      </section>

      <SectionNotes ownerId={ownerId} sectionKey={sectionKey} />
    </div>
  );
}

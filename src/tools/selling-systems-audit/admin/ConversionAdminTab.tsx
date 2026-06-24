import {
  useOwnerCurrency,
  useSubmittedAnswers,
} from "./useAdminSection";
import { SectionSummaryPanel } from "./SectionSummaryPanel";
import { SectionNotes } from "./SectionNotes";
import { ConversionAdminReadBack } from "./ConversionAdminReadBack";

/**
 * Per-owner Conversion tab. Template for the other five jsonb sections.
 *
 * Layout (top → bottom):
 *   1. Collapsed call-prep summary panel (AI). Generate is the only red.
 *   2. Submitted answers, rebuilt 1:1 from ReadBack primitives.
 *   3. Private coach notes (admin-only).
 */
export function ConversionAdminTab({ ownerId }: { ownerId: string }) {
  const submitted = useSubmittedAnswers(ownerId, "conversion");
  const currencyQ = useOwnerCurrency(ownerId);

  const answers = submitted.data?.submitted_answers ?? null;
  const submittedAt = submitted.data?.submitted_at ?? null;
  const hasSubmitted = !!submittedAt && !!answers && Object.keys(answers).length > 0;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <SectionSummaryPanel
        ownerId={ownerId}
        sectionKey="conversion"
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
            This owner hasn't submitted the Conversion section yet.
          </div>
        )}
        {hasSubmitted && answers && (
          <ConversionAdminReadBack
            answers={answers as Record<string, unknown>}
            currency={currencyQ.data ?? null}
          />
        )}
      </section>

      <SectionNotes ownerId={ownerId} sectionKey="conversion" />
    </div>
  );
}

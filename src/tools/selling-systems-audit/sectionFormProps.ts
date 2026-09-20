import type { ReactNode } from "react";
import type { CurrencyCode } from "@/lib/format-currency";

/**
 * Shared prop contract for the stepped audit section forms.
 *
 * The forms are presentational: they own step state, local draft state,
 * autosave timing and the submit UI, but they never fetch, never save and
 * never read auth, settings or the router. Everything owner-specific or
 * route-specific is supplied by the host (today the owner route; later the
 * public, no-account host) through these props.
 *
 * `TAnswers` is the section's whole-blob answer shape (e.g. PipelineAnswers).
 * Sections that need extra host-supplied context intersect this type with
 * their own additions rather than widening it.
 */

export type SectionSaveState = "idle" | "saving" | "saved";

export interface AuditSectionFormProps<TAnswers> {
  /** Heading shown above the stepper. */
  title: string;

  // ── Loaded state ────────────────────────────────────────────────
  /** Current draft blob, or null when there is no row yet. */
  draftAnswers: TAnswers | null;
  /** Last submitted snapshot, or null when never submitted. */
  submittedAnswers: TAnswers | null;
  /** True when the draft has diverged from the submitted snapshot. */
  hasUnsubmittedChanges: boolean;
  /** ISO timestamp of the last submission, or null. */
  submittedAt: string | null;
  /** True while the section row is still loading. */
  isLoading: boolean;
  /**
   * True once the host is able to persist (e.g. the owner session has
   * resolved). Hydration and autosave both wait for this.
   */
  canPersist: boolean;

  // ── Handlers ────────────────────────────────────────────────────
  /** Persist the draft blob. Resolves on success, rejects on failure. */
  saveDraft: (draft: TAnswers, hasSubmitted: boolean) => Promise<void>;
  /** Snapshot the draft as the submission. Rejects with a readable message. */
  submitSection: (draft: TAnswers) => Promise<void>;
  /** True while a submit is in flight. */
  isSubmitting: boolean;

  // ── Currency ────────────────────────────────────────────────────
  currency: CurrencyCode | null;
  currencyLoading: boolean;
  onCurrencyChange: (currency: CurrencyCode) => void;

  // ── Route-dependent chrome, supplied by the host ────────────────
  /** Rendered above the heading (e.g. a "Back to audit" link). */
  backSlot?: ReactNode;
  /** Post-submit panel; the form supplies the "edit again" callback. */
  renderReceived: (args: { onEdit: () => void }) => ReactNode;
}

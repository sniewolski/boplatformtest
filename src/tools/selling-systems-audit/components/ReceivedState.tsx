import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUDIT_SECTIONS, type AuditSectionKey } from "../config";

interface ReceivedStateProps {
  sectionKey: AuditSectionKey;
  onEdit: () => void;
}

/**
 * Post-submit confirmation panel shared by all six stepped audit sections.
 * Provides two actions:
 *  - "Edit my answers" (outline) — local handler from the host section.
 *  - "Next: {label}" or "Back to overview" (primary red) — derived from
 *    AUDIT_SECTIONS order, skipping non-stepped sections (e.g. content).
 */
export function ReceivedState({ sectionKey, onEdit }: ReceivedStateProps) {
  const idx = AUDIT_SECTIONS.findIndex((s) => s.key === sectionKey);
  const next = idx >= 0 ? AUDIT_SECTIONS[idx + 1] : undefined;
  const hasNextStepped = !!next && next.key !== "content";

  return (
    <section className="flex flex-col gap-5 border border-border rounded-xl px-8 py-10 items-start">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-9 rounded-full bg-[var(--surface-raised)] text-ink">
          <Check className="size-5" aria-hidden />
        </span>
        <h2 className="text-xl" style={{ letterSpacing: "-0.01em" }}>
          Received
        </h2>
      </div>
      <p className="text-ink-muted text-sm max-w-prose">
        Thanks — we've got everything we need for our call. If anything changes
        before then, jump back in and update your answers; submit again and the
        new version replaces the old.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={onEdit}
          className="active:scale-[0.97] transition-transform"
        >
          Edit my answers
        </Button>
        {hasNextStepped && next ? (
          <Button
            asChild
            className="bg-red text-white hover:bg-red/90 active:scale-[0.97] transition-transform"
          >
            <Link
              to="/app/tools/$key/$"
              params={{ key: "selling-systems-audit", _splat: next.key }}
            >
              Next: {next.label}
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            className="bg-red text-white hover:bg-red/90 active:scale-[0.97] transition-transform"
          >
            <Link
              to="/app/tools/$key/$"
              params={{ key: "selling-systems-audit", _splat: "" }}
            >
              Back to overview
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/core/roles/useMyRoles";
import {
  type AdminSectionKey,
  useSectionSummary,
} from "./useAdminSection";
import { generateSectionSummary } from "./sectionSummary.functions";

/**
 * Quiet, collapsed-by-default summary panel. Generate button is the only red
 * element on the page. Persisted summary text shows when present; regenerate
 * overwrites. Admin-only — never owner-facing.
 */
export function SectionSummaryPanel({
  ownerId,
  sectionKey,
  hasSubmitted,
}: {
  ownerId: string;
  sectionKey: AdminSectionKey;
  hasSubmitted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const summaryQ = useSectionSummary(ownerId, sectionKey);
  const generate = useServerFn(generateSectionSummary);
  const qc = useQueryClient();

  const generateMut = useMutation({
    mutationFn: () =>
      generate({ data: { ownerId, sectionKey } }) as Promise<{
        summaryText: string;
      }>,
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin-audit", "summary", ownerId, sectionKey],
      });
      setOpen(true);
    },
  });

  const hasSummary = !!summaryQ.data?.summary_text;
  const errorMsg =
    (generateMut.error as Error | undefined)?.message ??
    (summaryQ.error as Error | undefined)?.message ??
    null;

  return (
    <section
      className="border border-border rounded-xl bg-[var(--surface-raised)]/40"
      aria-label="AI call-prep summary"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-3.5 text-ink-muted shrink-0" aria-hidden />
          <span className="text-sm text-ink">Call-prep summary</span>
          {hasSummary && summaryQ.data?.updated_at && (
            <span className="text-xs text-ink-muted truncate">
              · updated {formatRelative(summaryQ.data.updated_at)}
            </span>
          )}
          {!hasSummary && (
            <span className="text-xs text-ink-muted truncate">· not generated</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-ink-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 flex flex-col gap-4">
          {summaryQ.isLoading && (
            <p className="text-xs text-ink-muted">Loading…</p>
          )}

          {hasSummary && (
            <div className="text-sm text-ink whitespace-pre-wrap max-w-prose leading-relaxed">
              {summaryQ.data!.summary_text}
            </div>
          )}

          {!hasSummary && !summaryQ.isLoading && (
            <p className="text-xs text-ink-muted">
              {hasSubmitted
                ? "Generate a brief recap and a few open questions to prep this call."
                : "Owner hasn't submitted this section yet."}
            </p>
          )}

          {errorMsg && (
            <p className="text-xs text-[var(--red)]">{errorMsg}</p>
          )}

          <div>
            <Button
              type="button"
              size="sm"
              onClick={() => generateMut.mutate()}
              disabled={!hasSubmitted || generateMut.isPending}
              className="active:scale-[0.97] transition-transform"
            >
              {generateMut.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Generating…
                </>
              ) : hasSummary ? (
                <>
                  <RefreshCw className="size-3.5" aria-hidden />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" aria-hidden />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

import { lazy, Suspense } from "react";
import type { ToolComponentProps } from "@/tools/registry";

const WillAiChat = lazy(() =>
  import("./Chat").then((m) => ({ default: m.WillAiChat })),
);

/**
 * In-tool router for Will AI.
 *
 * Single view for Phase 6 — the chat surface. `splat` is accepted per the
 * registry convention but currently unused; future deep links (e.g. reopen
 * a specific conversation) can slot in here.
 *
 * Chat is lazy-loaded to keep react-pdf (via PdfPreview) out of the SSR
 * module graph — react-pdf/pdfjs-dist touches browser-only DOMMatrix at
 * module top-level and crashes the Worker SSR runtime otherwise. Mirrors
 * the existing SOPs pattern (src/tools/sops/routes/App.tsx).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WillAiApp(_props: ToolComponentProps) {
  return (
    <Suspense
      fallback={
        <div className="app-content py-16">
          <p className="text-ink-muted text-sm">Loading…</p>
        </div>
      }
    >
      <WillAiChat />
    </Suspense>
  );
}

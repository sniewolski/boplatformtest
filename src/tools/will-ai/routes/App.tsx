import { lazy, Suspense } from "react";
import { Lock } from "lucide-react";
import type { ToolComponentProps } from "@/tools/registry";
import { useSession } from "@/core/auth/useSession";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { useWillAiSettings } from "@/lib/useWillAiSettings";

const WillAiChat = lazy(() =>
  import("./Chat").then((m) => ({ default: m.WillAiChat })),
);

/**
 * In-tool router for Will AI.
 *
 * Chat is lazy-loaded to keep react-pdf (via PdfPreview) out of the SSR
 * module graph — react-pdf/pdfjs-dist touches browser-only DOMMatrix at
 * module top-level and crashes the Worker SSR runtime otherwise. Mirrors
 * the existing SOPs pattern (src/tools/sops/routes/App.tsx).
 *
 * When `will_ai_settings.owner_access_enabled = false`, non-admin owners
 * hitting this route directly see a centered unavailable state instead of
 * the chat surface. Admins bypass the guard entirely.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WillAiApp(_props: ToolComponentProps) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const { data: roles = [] } = useMyRoles(userId ?? undefined);
  const isAdmin = roles.includes("admin");
  const { data: settings, isLoading } = useWillAiSettings();

  if (!isAdmin && !isLoading && settings?.owner_access_enabled === false) {
    return (
      <div className="app-content py-16 flex flex-col items-center justify-center text-center gap-3 min-h-[calc(100vh-8rem)]">
        <Lock className="size-6 text-ink-muted" aria-hidden />
        <p className="text-ink text-lg">Will AI is temporarily unavailable</p>
        <p className="text-ink-muted text-sm max-w-md">
          Check back soon.
        </p>
      </div>
    );
  }

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

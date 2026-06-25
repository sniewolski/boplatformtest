import { createFileRoute, Link } from "@tanstack/react-router";
import { Circle } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { useBookingReadiness } from "@/lib/useBookingReadiness";

export const Route = createFileRoute("/_authenticated/app/book-call")({
  component: BookCallPage,
});

function BookCallPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { isLoading, allComplete, incomplete } = useBookingReadiness(userId);

  if (isLoading) {
    return (
      <div className="app-content py-16">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!allComplete) {
    return (
      <div className="app-content py-16 flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
            Book a 1:1 call
          </h1>
          <p className="text-ink-muted text-base max-w-prose">
            Finish the items below first — you'll get far more out of the call
            once Will has your full audit and assessment to review.
          </p>
        </header>

        <ul className="flex flex-col">
          {incomplete.map((item, i) => (
            <li
              key={item.key}
              className={
                "py-4 " +
                (i < incomplete.length - 1 ? "border-b border-border" : "")
              }
            >
              <Link
                to={item.route}
                className="flex items-center gap-4 text-ink hover:text-ink"
              >
                <Circle
                  className="size-6 text-ink-muted shrink-0"
                  strokeWidth={1.5}
                  aria-label="Not submitted"
                />
                <span className="text-base">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <header className="flex flex-col gap-2 shrink-0">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Book a 1:1 call
        </h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Pick a time that works — your audit and assessment will be ready for review.
        </p>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-[var(--surface-raised)]">
        <iframe
          src="https://calendly.com/salesmanorg/1-1-selling-systems-audit-salescode-assessment-call?month=2026-06"
          title="Book a 1:1 call"
          className="w-full h-full"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

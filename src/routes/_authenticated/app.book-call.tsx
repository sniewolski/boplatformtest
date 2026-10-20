import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/book-call")({
  head: () => ({
    meta: [
      { title: "Book a 1:1 call | Salesman Lab" },
      { name: "description", content: "Choose a time for your 1:1 call with Will." },
      { property: "og:title", content: "Book a 1:1 call | Salesman Lab" },
      { property: "og:description", content: "Choose a time for your 1:1 call with Will." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookCallPage,
});

function BookCallPage() {
  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <header className="flex flex-col gap-2 shrink-0">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Book a 1:1 call
        </h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Pick a time that works for you
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

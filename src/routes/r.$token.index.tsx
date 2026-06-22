import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$token/")({
  component: RespondentEntry,
});

function RespondentEntry() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center flex flex-col gap-4">
        <h1 className="text-2xl">Respondent link</h1>
        <p className="text-ink-muted text-sm">
          This link is reserved for an invited respondent. The session flow will be
          available once a tool is mounted.
        </p>
      </section>
    </main>
  );
}

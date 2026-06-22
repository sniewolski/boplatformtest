import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$token/$")({
  component: RespondentSplat,
});

function RespondentSplat() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center flex flex-col gap-4">
        <h1 className="text-2xl">Nothing here yet</h1>
        <p className="text-ink-muted text-sm">
          The respondent flow for this tool hasn't been built.
        </p>
      </section>
    </main>
  );
}

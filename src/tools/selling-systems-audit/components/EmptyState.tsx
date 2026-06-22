export function EmptyState({ reason }: { reason?: string }) {
  return (
    <section className="flex flex-col gap-3 border border-dashed border-border rounded-xl px-6 py-8 max-w-prose">
      <h2 className="text-base font-medium text-ink">Fill in your numbers to see your funnel</h2>
      <p className="text-ink-muted text-sm">
        See exactly where your sales funnel leaks, and what it's costing you against the
        standard high performers hit. Pick your industry, enter your stage volumes and
        average deal value — your funnel and the biggest leaks appear here.
      </p>
      {reason === "no-leads" && (
        <p className="text-ink-muted text-xs">Add a lead count above zero to begin.</p>
      )}
    </section>
  );
}

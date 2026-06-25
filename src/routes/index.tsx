import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales Lab — sign in" },
      {
        name: "description",
        content: "Sales Lab is a private, invite-only platform for service-business owners.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-xl flex flex-col items-center text-center gap-8">
        <h1 className="text-ink" style={{ letterSpacing: "-0.02em" }}>
          Sales Lab
        </h1>

        <div className="flex flex-col gap-2">
          <p className="text-ink text-base">A private, invite-only workspace.</p>
          <p className="text-ink-muted text-sm">
            Access is provisioned by an administrator. There is no public sign-up.
          </p>
        </div>

        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </section>
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PublicAuditLayout } from "@/components/free-audit/PublicAuditLayout";

export const Route = createFileRoute("/free-audit/$token/done")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Audit Complete — Sales Lab" },
      { name: "description", content: "Your Selling Systems Audit has been submitted." },
      { property: "og:title", content: "Audit Complete — Sales Lab" },
      { property: "og:description", content: "Your Selling Systems Audit has been submitted." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FreeAuditDone,
});

function FreeAuditDone() {
  return (
    <PublicAuditLayout>
      <section className="flex min-h-[34rem] max-w-xl flex-col justify-center gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold sm:text-4xl">Thank you for completing the audit</h1>
          <p className="text-base text-ink-muted sm:text-lg">
            We'll review every completed audit. One person will be chosen and sent a personalised 30-day plan by email.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/free-audit">Back to the audit start</Link>
        </Button>
      </section>
    </PublicAuditLayout>
  );
}
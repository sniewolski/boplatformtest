import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function SectionLocked({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl mx-auto px-8 py-16 flex flex-col gap-8">
      <Link
        to="/app/tools/$key/$"
        params={{ key: "selling-systems-audit", _splat: "" }}
        className="inline-flex items-center gap-2 text-ink-muted text-sm hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to audit
      </Link>

      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 text-ink-muted text-sm">
          <Lock className="size-3.5" aria-hidden />
          <span>Coming soon</span>
        </div>
        <h1 className="text-2xl" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <p className="text-ink-muted text-base max-w-prose">{description}</p>
        <p className="text-ink-muted text-sm">
          Your coach is preparing this review. It will appear here when it's ready —
          no action needed from you.
        </p>
      </div>
    </div>
  );
}

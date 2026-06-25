import { Link } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { useSalesCodeIntake } from "../data/useSalesCodeIntake";
import { TYPE_PROFILES } from "../lib/typeProfiles";
import type { SalesCodeType } from "../lib/types";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

export function DashboardWidget() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake } = useSalesCodeIntake(userId);

  const submitted = !!intake?.submitted_at;
  const archetypeName = submitted && intake?.type_code
    ? TYPE_PROFILES[intake.type_code as SalesCodeType]?.name
    : null;

  const splat = submitted ? "result" : "assessment";

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "salescode", _splat: splat }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        SalesCode
      </span>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
        <span className="text-ink-muted text-sm">
          {submitted ? "Your archetype" : "Take the assessment"}
        </span>
        <span
          className="text-ink text-2xl font-medium"
          style={{ letterSpacing: "-0.01em" }}
        >
          {archetypeName ?? "Not started"}
        </span>
      </div>
    </Link>
  );
}

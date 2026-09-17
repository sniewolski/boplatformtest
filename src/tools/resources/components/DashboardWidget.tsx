import { Link } from "@tanstack/react-router";
import { useResources } from "@/lib/useResources";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms] motion-safe:active:scale-[0.97] motion-safe:transition-transform";

export function DashboardWidget() {
  const { data, isLoading, isError } = useResources();

  const count = data?.length ?? 0;
  const mainLine =
    isLoading || isError
      ? null
      : count === 0
        ? "No resources yet"
        : count === 1
          ? "1 resource"
          : `${count} resources`;

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "resources", _splat: "" }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Resources
      </span>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
        {mainLine && (
          <span
            className="text-ink text-2xl font-medium"
            style={{ letterSpacing: "-0.01em" }}
          >
            {mainLine}
          </span>
        )}
      </div>
    </Link>
  );
}

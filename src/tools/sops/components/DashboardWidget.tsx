import { Link } from "@tanstack/react-router";
import { useSops } from "@/lib/useSops";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

export function DashboardWidget() {
  const { data, isLoading, isError } = useSops();

  const count = data?.length ?? 0;
  const mainLine =
    isLoading || isError
      ? null
      : count === 0
        ? "No documents yet"
        : count === 1
          ? "1 document"
          : `${count} documents`;

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "sops", _splat: "" }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        SOPs
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

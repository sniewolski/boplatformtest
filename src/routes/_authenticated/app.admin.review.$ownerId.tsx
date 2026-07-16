import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { listOwners } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import { OwnerAuditDetail } from "@/components/admin/OwnerAuditDetail";
import { OwnerSalesCodeDetail } from "@/components/admin/OwnerSalesCodeDetail";
import { OwnerBusinessBriefDetail } from "@/components/admin/OwnerBusinessBriefDetail";

export const Route = createFileRoute(
  "/_authenticated/app/admin/review/$ownerId",
)({
  component: OwnerReviewDetail,
});

const SLOTS = [
  { key: "audit", label: "Selling Systems Audit" },
  { key: "salescode", label: "SalesCode" },
  { key: "brief", label: "Business Brief" },
] as const;

type SlotKey = (typeof SLOTS)[number]["key"];

function OwnerReviewDetail() {
  const { ownerId } = Route.useParams();
  const list = useServerFn(listOwners);
  const owners = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: () => list(),
  });
  const owner = owners.data?.find((o) => o.id === ownerId) ?? null;

  const [slot, setSlot] = useState<SlotKey>("audit");

  return (
    <div className="app-content py-12 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          to="/app/admin/review"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" />
          All owners
        </Link>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl">
            {owner?.fullName ??
              owner?.email ??
              (owners.isLoading ? "…" : "Unknown owner")}
          </h1>
          {owner?.fullName && (
            <p className="text-ink-muted text-sm">{owner.email}</p>
          )}
        </header>
      </div>

      <div
        role="tablist"
        aria-label="Review sections"
        className="inline-flex items-center gap-1 rounded-xl border border-border bg-[var(--surface-raised)] p-1 w-fit"
      >
        {SLOTS.map((s) => {
          const active = slot === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSlot(s.key)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                active
                  ? "bg-background text-ink font-medium"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div>
        {slot === "audit" && <OwnerAuditDetail ownerId={ownerId} />}
        {slot === "salescode" && <OwnerSalesCodeDetail ownerId={ownerId} />}
      </div>
    </div>
  );
}

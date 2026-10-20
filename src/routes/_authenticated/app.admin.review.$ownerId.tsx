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
import { OwnerDailyLogDetail } from "@/components/admin/OwnerDailyLogDetail";
import { OwnerActivityDetail } from "@/components/admin/OwnerActivityDetail";
import { Button } from "@/components/ui/button";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { salesOperatingSystemAuditManifest } from "@/tools/sales-operating-system-audit/manifest";
import { SosaOwnerReview } from "@/tools/sales-operating-system-audit/components/SosaOwnerReview";

export const Route = createFileRoute(
  "/_authenticated/app/admin/review/$ownerId",
)({
  component: OwnerReviewDetail,
  head: () => ({ meta: [
    { title: "Owner Audit Detail | Salesman Lab" },
    { name: "description", content: "Read an owner's audit answers and submissions in Salesman Lab." },
    { property: "og:title", content: "Owner Audit Detail | Salesman Lab" },
    { property: "og:description", content: "Read owner submissions by section or SOP." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const SLOTS = [
  { key: "audit", label: "Selling Systems Audit" },
  { key: "sosa", label: "Sales OS Audit" },
  { key: "salescode", label: "SalesCode" },
  { key: "brief", label: "Business Brief" },
  { key: "daily-log", label: "Daily Log" },
  { key: "activity", label: "Activity" },
] as const;

type SlotKey = (typeof SLOTS)[number]["key"];

function OwnerReviewDetail() {
  const { ownerId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: roles } = useMyRoles(user.id);
  const showSosa = roles?.includes("admin") || (!salesOperatingSystemAuditManifest.adminOnly && roles?.includes("mentor"));
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
        className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-[var(--surface-raised)] p-1 w-fit"
      >
        {SLOTS.filter((s) => s.key !== "sosa" || showSosa).map((s) => {
          const active = slot === s.key;
          return (
            <Button
              variant="ghost"
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
            </Button>
          );
        })}
      </div>

      <div>
        {slot === "audit" && <OwnerAuditDetail ownerId={ownerId} />}
        {slot === "sosa" && showSosa && <SosaOwnerReview key={ownerId} ownerId={ownerId} />}
        {slot === "salescode" && <OwnerSalesCodeDetail ownerId={ownerId} />}
        {slot === "brief" && <OwnerBusinessBriefDetail ownerId={ownerId} />}
        {slot === "daily-log" && <OwnerDailyLogDetail ownerId={ownerId} />}
        {slot === "activity" && <OwnerActivityDetail ownerId={ownerId} />}
      </div>
    </div>
  );
}

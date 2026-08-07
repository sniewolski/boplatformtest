import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/core/roles/useMyRoles";
import {
  getBusinessBriefForOwner,
  type BusinessBrief,
} from "@/core/business-brief/businessBrief.functions";
import { getBusinessBriefExportData } from "@/core/business-brief/briefExport.functions";
import {
  briefExportToMarkdown,
  hasAnyBriefContent,
} from "@/core/business-brief/briefExportToMarkdown";
import { downloadMarkdown } from "@/lib/download-file";
import { useOwnerCurrency } from "@/tools/selling-systems-audit/admin/useAdminSection";
import { currencySymbol, type CurrencyCode } from "@/lib/format-currency";


/**
 * Admin read-only view of an owner's Business Brief. Renders ALL eight
 * fields (including business_name and website — the AI-vs-admin split
 * only governs what Will AI is fed, not what admin sees).
 */
export function OwnerBusinessBriefDetail({ ownerId }: { ownerId: string }) {
  const fetchBrief = useServerFn(getBusinessBriefForOwner);
  const brief = useQuery({
    queryKey: ["admin", "business-brief", ownerId],
    queryFn: () => fetchBrief({ data: { ownerId } }),
  });
  const {
    data: ownerCurrency,
    isLoading: currencyLoading,
  } = useOwnerCurrency(ownerId);

  const isAdmin = useIsAdmin();
  const fetchExport = useServerFn(getBusinessBriefExportData);
  const exportMut = useMutation({
    mutationFn: async () => {
      const payload = await fetchExport({ data: { ownerId } });
      if (!hasAnyBriefContent(payload)) {
        throw new Error("Nothing to export yet.");
      }
      const md = briefExportToMarkdown(payload);
      const nameSource =
        payload.owner.fullName?.trim() || payload.owner.email.split("@")[0];
      const slug =
        nameSource
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "owner";
      const today = new Date().toISOString().slice(0, 10);
      downloadMarkdown(`brief-${slug}-${today}.md`, md);
    },
  });



  if (brief.isLoading) {
    return <p className="text-ink-muted text-sm">Loading…</p>;
  }
  if (brief.error) {
    return (
      <p className="text-sm text-[var(--red)]">
        {(brief.error as Error).message}
      </p>
    );
  }

  const data = brief.data;
  if (!data || !hasAny(data)) {
    return <p className="text-ink-muted text-sm">No brief submitted yet.</p>;
  }


  const symbol = currencyLoading || !ownerCurrency
    ? "£"
    : currencySymbol(ownerCurrency as CurrencyCode);
  const goalLine = formatGoalLine(data, symbol);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Field label="Business Name" value={data.business_name} />
      <Field label="Website" value={data.website} />
      <Field label="Your Offer" value={data.your_offer} />
      <Field label="Average Deal Size" value={data.average_deal_size} />
      <Field label="Your Ideal Client (ICP)" value={data.ideal_client} />
      <Field label="How You Sell" value={data.how_you_sell} />
      <Field label="Who's Selling" value={data.whos_selling} />
      <Field label="Sales Cycle" value={data.sales_cycle} />
      {goalLine && <Field label="Revenue Goal" value={goalLine} />}
      {(data.goal_notes ?? "").trim().length > 0 && (
        <Field label="Goal Notes" value={data.goal_notes} />
      )}
      {data.updated_at && (
        <p className="text-xs text-ink-muted">
          Last saved {new Date(data.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Mirrors the Will AI brief-block goal formatting: no amount → no line at
 * all; a missing period or target date simply drops that piece.
 * Currency symbol is the owner's own currency, falling back to "£" only when
 * the setting is not loaded or not set.
 */
function formatGoalLine(b: BusinessBrief, symbol: string): string | null {
  const amount = b.goal_amount === null || b.goal_amount === undefined ? null : Number(b.goal_amount);
  if (amount === null || !Number.isFinite(amount)) return null;
  const period =
    b.goal_period === "per_month"
      ? " per month"
      : b.goal_period === "per_year"
        ? " per year"
        : "";
  let by = "";
  if (b.goal_by) {
    const m = Number(b.goal_by.slice(5, 7));
    const y = b.goal_by.slice(0, 4);
    if (m >= 1 && m <= 12) by = ` by ${MONTHS[m - 1]} ${y}`;
  }
  return `${symbol}${amount.toLocaleString("en-GB")}${period}${by}`;
}

function hasAny(b: BusinessBrief): boolean {
  return (
    b.business_name.trim().length > 0 ||
    b.website.trim().length > 0 ||
    b.your_offer.trim().length > 0 ||
    b.average_deal_size.trim().length > 0 ||
    b.ideal_client.trim().length > 0 ||
    b.how_you_sell.trim().length > 0 ||
    b.whos_selling.trim().length > 0 ||
    b.sales_cycle.trim().length > 0 ||
    b.goal_amount !== null ||
    (b.goal_notes ?? "").trim().length > 0
  );
}


function Field({ label, value }: { label: string; value: string }) {
  const empty = !value.trim();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-ink-muted uppercase tracking-wide">
        {label}
      </span>
      {empty ? (
        <span className="text-sm text-ink-muted italic">—</span>
      ) : (
        <p className="text-sm text-ink whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { useConversionReview } from "../data/useConversionReview";
import { computeFunnel } from "../lib/computeFunnel";
import { fmtMoney } from "../lib/format";
import type { IndustryKey, PeriodKey } from "../config";
import type { StageVolumes } from "../lib/types";

export function DashboardWidget() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: saved } = useConversionReview(userId);

  let summary = "Not started — 0 of 4 reviews complete.";
  if (saved && saved.industry && saved.avg_deal_value && saved.stage_volumes) {
    const result = computeFunnel({
      industry: saved.industry as IndustryKey,
      period: saved.period as PeriodKey,
      avgDealValue: Number(saved.avg_deal_value),
      volumes: saved.stage_volumes as Partial<StageVolumes>,
    });
    if (result.valid && result.rankedBottlenecks.length > 0) {
      const worst = result.rankedBottlenecks[0];
      summary = `1 of 4 reviews complete · biggest leak ~${fmtMoney(worst.recoverableAnnualRevenue)}/yr`;
    } else if (result.valid) {
      summary = "1 of 4 reviews complete · no leaks against target.";
    }
  }

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "selling-systems-audit", _splat: "" }}
      className="block border border-border rounded-xl px-5 py-4 hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-ink font-medium">Selling Systems Audit</span>
      </div>
      <span className="text-ink-muted text-sm tabular-nums">{summary}</span>
    </Link>
  );
}

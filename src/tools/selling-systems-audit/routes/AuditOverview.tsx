import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { useCurrency } from "@/core/settings/useCurrency";
import { AUDIT_SECTIONS } from "../config";
import { useConversionReview } from "../data/useConversionReview";
import { computeFunnel } from "../lib/computeFunnel";
import type { IndustryKey, PeriodKey } from "../config";
import type { StageVolumes } from "../lib/types";
import { fmtMoney } from "../lib/format";

export function AuditOverview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: saved } = useConversionReview(userId);
  const { currency } = useCurrency();

  const conversionDone =
    !!saved &&
    !!saved.industry &&
    !!saved.avg_deal_value &&
    !!saved.stage_volumes &&
    Object.keys(saved.stage_volumes).length > 0;

  let conversionHeadline: string | null = null;
  if (conversionDone) {
    const result = computeFunnel({
      industry: saved!.industry as IndustryKey,
      period: saved!.period as PeriodKey,
      avgDealValue: Number(saved!.avg_deal_value),
      volumes: (saved!.stage_volumes ?? {}) as Partial<StageVolumes>,
    });
    if (result.valid && result.rankedBottlenecks.length > 0) {
      const worst = result.rankedBottlenecks[0];
      const moneyPart = currency
        ? ` · ~${fmtMoney(worst.recoverableAnnualRevenue, currency)}/yr recoverable`
        : "";
      conversionHeadline = `Biggest leak: ${worst.fromLabel} → ${worst.toLabel}${moneyPart}`;
    } else if (result.valid) {
      conversionHeadline = "No leaks — hitting the standard across the funnel.";
    }
  }

  const completed = conversionDone ? 1 : 0;
  const total = AUDIT_SECTIONS.length;

  return (
    <div className="app-content py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Selling Systems Audit
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          A four-part diagnostic of how your business converts attention into revenue —
          where the money is leaking, and what it would take to fix it.
        </p>
        <p className="text-ink-muted text-sm tabular-nums">
          {completed} of {total} reviews complete
        </p>
      </header>

      <ol className="flex flex-col">
        {AUDIT_SECTIONS.map((section, i) => {
          const isLast = i === AUDIT_SECTIONS.length - 1;
          const isConversion = section.key === "conversion";
          const isLocked = section.status === "locked";

          const rowBody = (
            <div
              className={`flex items-start justify-between gap-6 py-5 ${
                isLast ? "" : "border-b border-border"
              } ${isLocked ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-ink font-medium text-base">{section.label}</span>
                  {isLocked && (
                    <Lock className="size-3.5 text-ink-muted shrink-0" aria-hidden />
                  )}
                </div>
                <span className="text-ink-muted text-sm">{section.description}</span>
                {isConversion && conversionHeadline && (
                  <span className="text-ink text-sm mt-1 tabular-nums">
                    {conversionHeadline}
                  </span>
                )}
                {isConversion && !conversionHeadline && (
                  <span className="text-ink-muted text-sm mt-1">Not started</span>
                )}
                {isLocked && (
                  <span className="text-ink-muted text-xs mt-1">Available soon</span>
                )}
              </div>
              {!isLocked && (
                <ArrowRight
                  className="size-4 text-ink-muted mt-1 shrink-0"
                  aria-hidden
                />
              )}
            </div>
          );

          if (isLocked) {
            return (
              <li
                key={section.key}
                title="Available soon"
                aria-disabled
                className="cursor-not-allowed select-none"
              >
                {rowBody}
              </li>
            );
          }

          return (
            <li key={section.key}>
              <Link
                to="/app/tools/$key/$"
                params={{ key: "selling-systems-audit", _splat: section.key }}
                className="group block transition-[background-color] duration-[120ms] hover:bg-[var(--surface-raised)] rounded-md -mx-3 px-3"
              >
                {rowBody}
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="text-ink-muted text-xs">
        {CURRENCY === "£"
          ? "Figures are in pounds sterling."
          : `Figures are shown in ${CURRENCY}.`}
      </p>
    </div>
  );
}

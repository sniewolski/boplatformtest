import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ListOrdered } from "lucide-react";
import { useSosaAnswers } from "../data/sosaAnswers";
import { getOverallProgress, getSectionProgress, getVisibleSections } from "../engine/rules";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { formatSosaDate, useSosaSubmission } from "../data/sosaSubmission";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const KEY = "sales-operating-system-audit";

/** current: "screening" or a section number. */
function SectionNav({ current, onNavigate }: { current: "screening" | number; onNavigate?: () => void }) {
  const { answers = {} } = useSosaAnswers();
  const sections = getVisibleSections(answers);
  const item = (active: boolean) =>
    `flex items-center gap-2 rounded-md -mx-3 px-3 py-2 text-sm transition-[background-color] duration-[120ms] hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active ? "bg-[var(--surface-raised)] text-ink font-medium" : "text-ink-muted"
    }`;
  return (
    <nav aria-label="Audit sections">
      <ul className="flex flex-col list-none">
        <li>
          <Link
            to="/app/tools/$key/$"
            params={{ key: KEY, _splat: "screening" }}
            className={item(current === "screening")}
            aria-current={current === "screening" ? "page" : undefined}
            onClick={onNavigate}
          >
            <span className="flex-1">Screening</span>
          </Link>
        </li>
        {sections.map((s) => {
          const p = getSectionProgress(s.number, answers);
          const done = p.total > 0 && p.answered === p.total;
          const active = current === s.number;
          return (
            <li key={s.number}>
              <Link
                to="/app/tools/$key/$"
                params={{ key: KEY, _splat: `section/${s.number}` }}
                className={item(active)}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                <span className="flex-1 min-w-0">
                  {s.number}. {s.title}
                </span>
                <span className="text-xs text-ink-muted tabular-nums shrink-0">
                  {p.answered}/{p.total}
                </span>
                <span className="w-4 shrink-0">
                  {done && <Check className="size-4 text-ink" aria-label="Complete" />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AuditLayout({ current, children }: { current: "screening" | number; children: ReactNode }) {
  const { answers = {} } = useSosaAnswers();
  const overall = getOverallProgress(answers);
  const pct = overall.total ? Math.round((overall.answered / overall.total) * 100) : 0;
  const [open, setOpen] = useState(false);
  const { submittedAt } = useSosaSubmission();

  return (
    <div className="app-content py-12 flex flex-col gap-8">
      <Toaster />
      <PageHeader title="Sales Operating System Audit">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted tabular-nums flex flex-wrap gap-x-3">
            <span>
              {overall.answered} of {overall.total} answered
            </span>
            {submittedAt && <span>Submitted {formatSosaDate(submittedAt)}</span>}
          </p>
          <div
            className="h-1 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={overall.total}
            aria-valuenow={overall.answered}
            aria-label="Overall progress"
          >
            <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </PageHeader>

      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <ListOrdered className="size-4" /> Sections
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Sections</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <SectionNav current={current} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <SectionNav current={current} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

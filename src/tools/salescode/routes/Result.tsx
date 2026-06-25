import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useSalesCodeIntake } from "../data/useSalesCodeIntake";
import { scoreSalesCode } from "../lib/scoring";
import type { AnswerMap, AxisLetter, TraitOutcome } from "../lib/types";
import {
  AXIS_BLURBS,
  TRAIT_AREA_LABELS,
  TRAIT_AREA_OF,
  TRAIT_COPY,
  TYPE_LEAD_IN,
  type TraitArea,
} from "../lib/copy";

/**
 * SalesCode result renderer. Reads the submitted snapshot from the intake
 * row and re-scores it client-side — this is deterministic and matches
 * what was persisted at submit, but means the page survives copy edits to
 * `copy.ts` without a migration.
 */
export function SalesCodeResultRoute() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useSalesCodeIntake(userId);

  if (isLoading) {
    return <div className="text-ink-muted text-sm py-8">Loading…</div>;
  }
  if (!intake?.submitted_answers) {
    return (
      <div className="max-w-2xl flex flex-col gap-4 py-8">
        <p className="text-ink-muted">
          No submitted result yet. Complete the assessment to see your SalesCode.
        </p>
        <div>
          <Button asChild variant="outline">
            <Link to="/app/tools/$key/$" params={{ key: "salescode", _splat: "" }}>
              <ArrowLeft className="size-4 mr-2" /> Back
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const answers = intake.submitted_answers as AnswerMap;
  const result = scoreSalesCode(answers);
  const letters = result.type.split("") as AxisLetter[];

  // Group traits by cosmetic area; pull out the neutral style trait.
  const neutralStyle = result.traits.find((t) => t.key === "introvert-extrovert");
  const grouped: Record<TraitArea, TraitOutcome[]> = {
    "sales-skills": [],
    "inner-game": [],
    "habits-and-drive": [],
  };
  for (const t of result.traits) {
    if (t.key === "introvert-extrovert") continue;
    grouped[TRAIT_AREA_OF[t.key]].push(t);
  }

  return (
    <div className="max-w-3xl flex flex-col gap-10 py-8">
      <header className="flex flex-col gap-3">
        <span className="text-xs text-ink-muted uppercase tracking-wide">Your SalesCode</span>
        <h1 className="text-4xl font-mono text-ink" style={{ letterSpacing: "0.02em" }}>
          {result.type}
        </h1>
        <p className="text-ink-muted">
          {TYPE_LEAD_IN.replace("{TYPE}", result.type)}
        </p>
      </header>

      {/* Four-letter breakdown */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm uppercase tracking-wide text-ink-muted">What each letter means</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {letters.map((L, i) => {
            const meta = AXIS_BLURBS[L];
            return (
              <div
                key={`${L}-${i}`}
                className="rounded-md border border-border bg-surface px-4 py-3 flex flex-col gap-1"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-lg text-ink">{L}</span>
                  <span className="text-sm text-ink">{meta.title}</span>
                </div>
                <p className="text-sm text-ink-muted">{meta.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Neutral selling style one-liner */}
      {neutralStyle ? (
        <section className="rounded-md border border-border bg-surface px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-ink-muted mb-1">
            {TRAIT_COPY["introvert-extrovert"].name}
          </div>
          <p className="text-sm text-ink">
            {neutralStyle.label === "Extrovert"
              ? TRAIT_COPY["introvert-extrovert"].neutralExtrovert
              : TRAIT_COPY["introvert-extrovert"].neutralIntrovert}
          </p>
        </section>
      ) : null}

      {/* Trait profile grouped by area */}
      {(Object.keys(grouped) as TraitArea[]).map((area) => {
        const items = grouped[area];
        if (!items.length) return null;
        return (
          <section key={area} className="flex flex-col gap-3">
            <h2 className="text-sm uppercase tracking-wide text-ink-muted">
              {TRAIT_AREA_LABELS[area]}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((t) => {
                const meta = TRAIT_COPY[t.key];
                const isStrength = t.kind === "strength";
                const body = isStrength ? meta.strength : meta.development;
                return (
                  <li
                    key={t.key}
                    className="rounded-md border border-border bg-surface px-4 py-3 flex gap-3"
                  >
                    <div className="pt-0.5">
                      {isStrength ? (
                        <CheckCircle2 className="size-5 text-ink" />
                      ) : (
                        <Circle className="size-5 text-ink-muted" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm text-ink">{meta.name}</span>
                        <span className="text-xs text-ink-muted">— {t.label}</span>
                      </div>
                      {body ? <p className="text-sm text-ink-muted">{body}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <footer className="flex items-center justify-between gap-4 pt-2">
        <Button asChild variant="outline">
          <Link to="/app/tools/$key/$" params={{ key: "salescode", _splat: "" }}>
            <ArrowLeft className="size-4 mr-2" /> Back to overview
          </Link>
        </Button>
        {intake.submitted_at ? (
          <span className="text-xs text-ink-muted">
            Submitted {new Date(intake.submitted_at).toLocaleDateString()}
          </span>
        ) : null}
      </footer>
    </div>
  );
}

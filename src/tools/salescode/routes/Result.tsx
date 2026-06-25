import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useSalesCodeIntake } from "../data/useSalesCodeIntake";
import { scoreSalesCode } from "../lib/scoring";
import type { AnswerMap, TraitOutcome } from "../lib/types";
import {
  TRAIT_AREA_LABELS,
  TRAIT_AREA_OF,
  TRAIT_COPY,
  type TraitArea,
} from "../lib/copy";
import { TYPE_PROFILES } from "../lib/typeProfiles";

/**
 * SalesCode result renderer. Reads the submitted snapshot from the intake
 * row and re-scores it client-side — this is deterministic and matches what
 * was persisted at submit, but lets the page survive copy edits without a
 * migration. Renders the archetype profile (from TYPE_PROFILES) above the
 * three trait-area sections.
 */
export function SalesCodeResultRoute() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useSalesCodeIntake(userId);

  if (isLoading) {
    return (
      <div className="app-content py-12">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }
  if (!intake?.submitted_answers) {
    return (
      <div className="app-content py-12 flex flex-col gap-4">
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
  const profile = TYPE_PROFILES[result.type];

  // Group every trait (including introvert-extrovert) by cosmetic area.
  const grouped: Record<TraitArea, TraitOutcome[]> = {
    "sales-skills": [],
    "inner-game": [],
    "habits-and-drive": [],
  };
  for (const t of result.traits) grouped[TRAIT_AREA_OF[t.key]].push(t);

  return (
    <div className="app-content py-12 flex flex-col gap-12">
      {profile ? (
        <article className="flex flex-col gap-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl text-ink">{profile.name}</h1>
            <p className="text-lg text-ink-muted">{profile.tagline}</p>
          </header>

          {profile.intro.length > 0 ? (
            <div className="flex flex-col gap-4">
              {profile.intro.map((p, i) => (
                <p key={i} className="text-ink leading-relaxed">{p}</p>
              ))}
            </div>
          ) : null}

          {profile.pullQuote ? (
            <p className="text-xl font-medium text-ink italic leading-snug py-2">
              {profile.pullQuote}
            </p>
          ) : null}

          {profile.peopleLikeYou.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm uppercase tracking-wide text-ink-muted">People like you</h2>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-ink">
                {profile.peopleLikeYou.map((p, i) => (
                  <li key={i} className="after:content-['·'] after:ml-3 after:text-ink-muted last:after:hidden">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {profile.strengths.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm uppercase tracking-wide text-ink-muted">Strengths</h2>
              <ul className="flex flex-col gap-3">
                {profile.strengths.map((s, i) => (
                  <li key={i} className="text-ink leading-relaxed">
                    <span className="font-semibold">{s.lead}</span>
                    {s.body ? <> {s.body}</> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {profile.weaknesses.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm uppercase tracking-wide text-ink-muted">Weaknesses</h2>
              <ul className="flex flex-col gap-3">
                {profile.weaknesses.map((w, i) => (
                  <li key={i} className="text-ink leading-relaxed">
                    <span className="font-semibold">{w.lead}</span>
                    {w.body ? <> {w.body}</> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {profile.businessAndSales.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm uppercase tracking-wide text-ink-muted">Business & sales</h2>
              <div className="flex flex-col gap-4">
                {profile.businessAndSales.map((p, i) => (
                  <p key={i} className="text-ink leading-relaxed">{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {profile.closingQuote ? (
            <p className="text-xl font-medium text-ink italic leading-snug py-2">
              {profile.closingQuote}
            </p>
          ) : null}
        </article>
      ) : (
        <p className="text-ink-muted">
          Your archetype profile isn't available yet — trait breakdown below.
        </p>
      )}

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
                const body = isStrength ? meta.strengthLine : meta.growthLine;
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

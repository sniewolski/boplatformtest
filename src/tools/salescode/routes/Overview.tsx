import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, RotateCcw, Share2 } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useRetakeSalesCode,
  useSalesCodeIntake,
} from "../data/useSalesCodeIntake";
import { TOTAL_QUESTIONS, PRESENTATION_ORDER } from "../lib/questions";
import type { AnswerMap } from "../lib/types";
import { TYPE_PROFILES } from "../lib/typeProfiles";
import { ShareLinkCard } from "../components/ShareLinkCard";
import { SentAssessmentsList } from "../components/SentAssessmentsList";

/**
 * SalesCode overview — entry point. Shows Start, Resume, or "review your
 * result" depending on what the owner has done. Submitted state surfaces
 * the archetype name alongside the type code (no tracked-uppercase eyebrow),
 * a retake control behind a confirm, and the share / sent-assessments
 * surfaces.
 */
export function SalesCodeOverview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useSalesCodeIntake(userId);
  const retake = useRetakeSalesCode(userId);
  const navigate = useNavigate({ from: "/app/tools/$key/$" });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const draft = (intake?.draft_answers ?? {}) as AnswerMap;
  const draftCount = PRESENTATION_ORDER.reduce(
    (n, id) => n + (draft[id] ? 1 : 0),
    0,
  );
  const isSubmitted =
    !!intake?.submitted_at && !intake?.has_unsubmitted_changes;
  const hasDraft = draftCount > 0 && !isSubmitted;

  const ctaLabel = isSubmitted
    ? "Review your result"
    : hasDraft
      ? `Resume (${draftCount}/${TOTAL_QUESTIONS})`
      : "Start assessment";

  const typeCode = intake?.type_code ?? null;
  const profile = typeCode ? TYPE_PROFILES[typeCode] : undefined;
  const submittedDate = intake?.submitted_at
    ? new Date(intake.submitted_at).toLocaleDateString()
    : null;

  const onConfirmRetake = async () => {
    try {
      await retake.mutateAsync();
      setConfirmOpen(false);
      navigate({
        to: "/app/tools/$key/$",
        params: { key: "salescode", _splat: "assessment" },
      });
    } catch {
      // Leave dialog open; mutation error surfaces via console / next try.
    }
  };

  return (
    <div className="app-content py-12 flex flex-col gap-10">
      <header className="flex flex-col gap-3 max-w-prose">
        <h1 className="text-2xl text-ink" style={{ letterSpacing: "-0.01em" }}>
          SalesCode
        </h1>
        <p className="text-ink-muted">
          A short self-assessment that returns your four-letter SalesCode
          type and a trait profile across sales skills, inner game, and
          habits &amp; drive. {TOTAL_QUESTIONS} statements; about 15
          minutes; progress saves automatically.
        </p>
      </header>

      {isSubmitted ? (
        <section className="rounded-2xl border border-border bg-surface p-6 max-w-xl flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-mono text-2xl text-ink">
                {typeCode ?? "—"}
              </span>
              {profile ? (
                <span className="text-ink text-lg">{profile.name}</span>
              ) : null}
            </div>
            {submittedDate ? (
              <span className="text-xs text-ink-muted">
                Submitted {submittedDate}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="active:scale-[0.97] transition-transform"
            >
              <Link
                to="/app/tools/$key/$"
                params={{ key: "salescode", _splat: "result" }}
                className="inline-flex items-center gap-2"
              >
                Review your result <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              disabled={retake.isPending}
              className="active:scale-[0.97] transition-transform inline-flex items-center gap-2"
            >
              <RotateCcw className="size-4" /> Retake assessment
            </Button>
          </div>
        </section>
      ) : (
        <div>
          <Button
            asChild
            disabled={isLoading}
            className="active:scale-[0.97] transition-transform"
          >
            <Link
              to="/app/tools/$key/$"
              params={{ key: "salescode", _splat: "assessment" }}
              className="inline-flex items-center gap-2"
            >
              {ctaLabel} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}

      <section className="flex flex-col gap-4 max-w-xl">
        <div className="flex items-center gap-2 text-ink">
          <Share2 className="size-4" />
          <h2 className="text-base">Share with someone</h2>
        </div>
        <p className="text-sm text-ink-muted">
          Generate a private link to send the SalesCode assessment to a
          colleague. Their result comes back to you here.
        </p>
        <ShareLinkCard />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base text-ink">Sent assessments</h2>
        <SentAssessmentsList />
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retake the assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Your previous answers will be loaded so you can edit them.
              Submitting again will replace your current result — there is
              no history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retake.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void onConfirmRetake();
              }}
              disabled={retake.isPending}
            >
              {retake.isPending ? "Reopening…" : "Retake"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

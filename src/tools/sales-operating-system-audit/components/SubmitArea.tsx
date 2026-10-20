import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSosaAnswers } from "../data/sosaAnswers";
import { SosaSubmitError, formatSosaDate, submitSosaAudit, useSosaSubmission } from "../data/sosaSubmission";
import { getSectionProgress, getVisibleSections } from "../engine/rules";
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

const KEY = "sales-operating-system-audit";

/** Shown on the last visible section, in place of Next. */
export function SubmitArea() {
  const { answers = {}, ownerId } = useSosaAnswers();
  const { submittedAt, isLoading } = useSosaSubmission();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return null;
  if (submittedAt) {
    return (
      <p className="text-sm text-ink-muted max-w-sm text-right">
        Submitted on {formatSosaDate(submittedAt)}. You can still edit any answer. Changes save automatically.
      </p>
    );
  }

  const incomplete = getVisibleSections(answers)
    .map((s) => ({ s, p: getSectionProgress(s.number, answers) }))
    .filter(({ p }) => p.answered < p.total);
  const left = incomplete.reduce((n, { p }) => n + (p.total - p.answered), 0);
  const ready = incomplete.length === 0;

  const submit = async () => {
    if (!ownerId) return;
    setBusy(true);
    setError(null);
    try {
      await submitSosaAudit(qc, ownerId);
      setOpen(false);
      toast.success("Audit submitted");
    } catch (e) {
      setOpen(false);
      setError(e instanceof SosaSubmitError ? e.message : "Couldn't submit your audit. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" disabled={!ready || busy} onClick={() => setOpen(true)}>
        Submit audit
      </Button>
      {!ready && (
        <p className="text-sm text-ink-muted text-right max-w-md">
          {left} {left === 1 ? "question" : "questions"} left in {incomplete.length}{" "}
          {incomplete.length === 1 ? "section" : "sections"}:{" "}
          {incomplete.map(({ s }, i) => (
            <span key={s.number}>
              {i > 0 && ", "}
              <Link
                to="/app/tools/$key/$"
                params={{ key: KEY, _splat: `section/${s.number}` }}
                className="text-ink underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {s.number}. {s.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      {error && (
        <p className="text-sm text-ink-muted text-right" role="alert">
          {error}
        </p>
      )}
      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your audit?</AlertDialogTitle>
            <AlertDialogDescription>You can keep editing your answers afterwards.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {busy ? "Submitting…" : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

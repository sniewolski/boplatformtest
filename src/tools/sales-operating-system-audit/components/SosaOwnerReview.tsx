import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SECTIONS, SOPS, type SosaQuestion } from "../config/questionBank";
import { useSosaOwnerAnswers, useSosaOwnerCurrency, useSosaOwnerSubmission } from "../data/sosaAdmin";
import { getVisibleQuestions, getVisibleSections } from "../engine/rules";
import { formatSosaReviewDate, getSosaReviewStatus, sosaReviewStatusLabel } from "../engine/adminReview";
import { SosaQuestionReadback } from "./SosaQuestionReadback";

export function SosaOwnerReview({ ownerId }: { ownerId: string }) {
  const answersQuery = useSosaOwnerAnswers(ownerId);
  const submissionQuery = useSosaOwnerSubmission(ownerId);
  const currencyQuery = useSosaOwnerCurrency(ownerId);
  const [mode, setMode] = useState<"section" | "sop">("section");
  const [sopId, setSopId] = useState(SOPS[0]?.id ?? "");
  if (answersQuery.isPending || submissionQuery.isPending || currencyQuery.isPending) return <p className="text-sm text-ink-muted">Loading…</p>;
  const error = answersQuery.error ?? submissionQuery.error ?? currencyQuery.error;
  if (error) return <p className="text-sm text-destructive" role="alert">Couldn't load this audit. {error.message}</p>;
  const answers = answersQuery.data ?? {};
  const submittedAt = submissionQuery.data?.submitted_at ?? null;
  const currency = currencyQuery.data ?? null;
  const status = getSosaReviewStatus(answers, submittedAt);
  const sections = getVisibleSections(answers);
  const visibleQuestions = sections.flatMap((s) => getVisibleQuestions(s.number, answers));
  const forSop = (id: string) => visibleQuestions.filter((q) => q.sops.includes(id) || q.sops.includes("ALL"))
    .sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  const readQuestion = (question: SosaQuestion) => <SosaQuestionReadback key={question.id} question={question} answers={answers} submittedAt={submittedAt} currency={currency} />;

  return <div className="flex flex-col gap-8">
    <header className="flex flex-wrap justify-between items-start gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl text-ink">Sales OS Audit</h2>
        <div className="text-sm text-ink-muted flex flex-wrap gap-x-4 gap-y-1">
          <span>{sosaReviewStatusLabel(status)}</span>
          {submittedAt && <span>Submitted {formatSosaReviewDate(submittedAt)}</span>}
          <span>{status.answered} of {status.total} answered</span>
        </div>
      </div>
      <div role="group" aria-label="Audit view" className="inline-flex gap-1 rounded-lg border border-border p-1">
        <Button size="sm" variant={mode === "section" ? "secondary" : "ghost"} aria-pressed={mode === "section"} onClick={() => setMode("section")}>By section</Button>
        <Button size="sm" variant={mode === "sop" ? "secondary" : "ghost"} aria-pressed={mode === "sop"} onClick={() => setMode("sop")}>By SOP</Button>
      </div>
    </header>

    {mode === "section" ? <>
      <nav aria-label="Jump to audit section" className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-5">
        {sections.map((section) => <a key={section.number} href={`#sosa-review-section-${section.number}`} className="text-xs text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">{section.number}. {section.title}</a>)}
      </nav>
      {sections.map((section) => {
        const questions = getVisibleQuestions(section.number, answers);
        const groups = new Map<string, SosaQuestion[]>();
        const ungrouped = questions.filter((q) => !q.group);
        for (const q of questions) if (q.group) groups.set(q.group, [...(groups.get(q.group) ?? []), q]);
        return <section key={section.number} id={`sosa-review-section-${section.number}`} className="flex flex-col gap-6 scroll-mt-6">
          <h3 className="text-lg text-ink border-b border-border pb-2">{section.number}. {section.title}</h3>
          {ungrouped.map(readQuestion)}
          {[...groups].map(([group, qs]) => <div key={group} className="flex flex-col gap-6"><h4 className="text-base font-medium text-ink">{group}</h4>{qs.map(readQuestion)}</div>)}
        </section>;
      })}
    </> : <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8">
      <nav aria-label="SOPs" className="flex flex-col gap-1">
        {SOPS.map((sop) => <Button key={sop.id} variant={sopId === sop.id ? "secondary" : "ghost"} aria-pressed={sopId === sop.id}
          onClick={() => setSopId(sop.id)} className="h-auto min-h-10 justify-between text-left whitespace-normal text-xs py-2">
          <span>{sop.id} · {sop.name}</span><span className="text-ink-muted tabular-nums shrink-0">{forSop(sop.id).length}</span>
        </Button>)}
      </nav>
      <section className="flex flex-col gap-6 min-w-0" aria-label="Selected SOP questions">
        <h3 className="text-lg text-ink">{sopId} · {SOPS.find((s) => s.id === sopId)?.name}</h3>
        {forSop(sopId).map((q) => <div key={q.id} className="flex flex-col gap-2">
          <p className="text-xs text-ink-muted">{q.number} · {SECTIONS.find((s) => s.number === q.section)?.title}</p>
          {readQuestion(q)}
        </div>)}
        {forSop(sopId).length === 0 && <p className="text-sm text-ink-muted">No visible questions.</p>}
      </section>
    </div>}
  </div>;
}
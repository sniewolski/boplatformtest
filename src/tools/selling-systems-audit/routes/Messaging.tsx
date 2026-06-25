import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReceivedState } from "../components/ReceivedState";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  useMessagingIntake,
  useSaveDraft,
  useSubmitIntake,
  type MessagingAnswers,
  type MessagingConsistencyAnswers,
  type MessagingIcpAnswers,
  type MessagingProblemAnswers,
  type MessagingProofAnswers,
  type MessagingValueAnswers,
} from "../data/useMessagingReview";
import {
  MESSAGING_STEPS,
  ICP_WRITTEN,
  ICP_BASIS,
  YES_SOMEWHAT_NO,
  RECOGNITION,
  MESSAGE_LEVEL,
  CAN_TELL,
  COMPETE_BASIS,
  EVIDENCE_TYPES,
  PROOF_SPECIFICITY,
  PROOF_TARGETING,
  CONSISTENCY_LEVELS,
  MATCH_LEVELS,
} from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";
import {
  Chips,
  MaturitySpectrum,
  OptionalText,
  Question,
  Segmented,
  TextField,
} from "../components/IntakeFields";
import {
  chipsLabels,
  labelOf,
  ReadGroup,
  ReadRow,
  ReadText,
} from "../components/ReadBack";

const AUTOSAVE_MS = 700;

export function Messaging() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useMessagingIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);

  const [stepIdx, setStepIdx] = useState(0);
  const step = MESSAGING_STEPS[stepIdx];

  const [icp, setIcp] = useState<MessagingIcpAnswers>({});
  const [problem, setProblem] = useState<MessagingProblemAnswers>({});
  const [value, setValue] = useState<MessagingValueAnswers>({});
  const [proof, setProof] = useState<MessagingProofAnswers>({});
  const [consistency, setConsistency] = useState<MessagingConsistencyAnswers>({});

  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAfterSubmit, setEditingAfterSubmit] = useState(false);

  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as MessagingAnswers;
    if (d.icp) setIcp(d.icp);
    if (d.problem) setProblem(d.problem);
    if (d.value) setValue(d.value);
    if (d.proof) setProof(d.proof);
    if (d.consistency) setConsistency(d.consistency);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  const currentDraft = useMemo<MessagingAnswers>(
    () => ({ icp, problem, value, proof, consistency }),
    [icp, problem, value, proof, consistency],
  );

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<MessagingAnswers>(currentDraft);
  const dirtyRef = useRef(false);
  const hasSubmittedRef = useRef(!!intake?.submitted_at);
  const saveMutateRef = useRef(save.mutate);

  useEffect(() => {
    latestDraftRef.current = currentDraft;
  }, [currentDraft]);
  useEffect(() => {
    saveMutateRef.current = save.mutate;
  }, [save.mutate]);
  useEffect(() => {
    hasSubmittedRef.current = !!intake?.submitted_at;
  }, [intake?.submitted_at]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current || !userId) return;
    const draft = latestDraftRef.current;
    const serialized = JSON.stringify(draft);
    dirtyRef.current = false;
    lastSavedRef.current = serialized;
    setSaveState("saving");
    saveMutateRef.current(
      { draft, hasSubmitted: hasSubmittedRef.current },
      {
        onSuccess: () => setSaveState("saved"),
        onError: () => {
          dirtyRef.current = true;
          setSaveState("idle");
        },
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    const serialized = JSON.stringify(currentDraft);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = serialized;
      return;
    }
    if (lastSavedRef.current === serialized) return;
    dirtyRef.current = true;
    setSaveState("saving");
    const t = setTimeout(() => flushSave(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [currentDraft, hydrated, userId, flushSave]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") flushSave();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flushSave();
    };
  }, [flushSave]);

  const isReceived =
    !!intake?.submitted_at && !intake.has_unsubmitted_changes && !editingAfterSubmit;

  async function handleSubmit() {
    setSubmitError(null);
    try {
      await submit.mutateAsync({ draft: currentDraft });
      lastSavedRef.current = JSON.stringify(currentDraft);
      setSaveState("saved");
      setEditingAfterSubmit(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not submit.");
    }
  }

  const hasSubmitted = !!intake?.submitted_at;
  const hasUnsubmittedChanges = !!intake?.has_unsubmitted_changes;
  const submitLabel = !hasSubmitted
    ? "Submit"
    : hasUnsubmittedChanges
      ? "Resubmit"
      : "Submitted";

  return (
    <div className="app-content py-12 flex flex-col gap-10">
      <Link
        to="/app/tools/$key/$"
        params={{ key: "selling-systems-audit", _splat: "" }}
        className="inline-flex items-center gap-2 text-ink-muted text-sm hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to audit
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Messaging & Positioning
        </h1>
      </header>

      {isReceived ? (
        <ReceivedState
          sectionKey="messaging"
          onEdit={() => {
            setEditingAfterSubmit(true);
            setStepIdx(0);
          }}
        />
      ) : (
        <>
          <ProgressBar steps={MESSAGING_STEPS} currentIdx={stepIdx} onJump={setStepIdx} />

          <div className="flex flex-col gap-8" onBlurCapture={flushSave}>
            {step.key === "icp" && <IcpStep value={icp} onChange={setIcp} />}
            {step.key === "problem" && <ProblemStep value={problem} onChange={setProblem} />}
            {step.key === "value" && <ValueStep value={value} onChange={setValue} />}
            {step.key === "proof" && <ProofStep value={proof} onChange={setProof} />}
            {step.key === "consistency" && (
              <ConsistencyStep value={consistency} onChange={setConsistency} />
            )}
            {step.key === "review" && (
              <ReviewStep
                icp={icp}
                problem={problem}
                value={value}
                proof={proof}
                consistency={consistency}
                hasSubmitted={hasSubmitted}
                hasUnsubmittedChanges={hasUnsubmittedChanges}
                submitting={submit.isPending}
                onSubmit={handleSubmit}
                error={submitError}
                submitLabel={submitLabel}
              />
            )}
          </div>

          <StepNav
            currentIdx={stepIdx}
            total={MESSAGING_STEPS.length}
            onPrev={() => {
              flushSave();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            onNext={() => {
              flushSave();
              setStepIdx((i) => Math.min(MESSAGING_STEPS.length - 1, i + 1));
            }}
            saveState={saveState}
          />
        </>
      )}
    </div>
  );
}


// ───────── Step 1: Ideal customer clarity ─────────

function IcpStep({
  value,
  onChange,
}: {
  value: MessagingIcpAnswers;
  onChange: (next: MessagingIcpAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Ideal customer clarity"
      />
      <Question
        label="Describe your ideal client"
        hint="A short profile — industry, size, role — and what's going on for them when they look for you."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <FieldStack label="Industry">
              <TextField
                value={value.industry ?? ""}
                onChange={(v) => onChange({ ...value, industry: v })}
                placeholder="e.g. Trades, SaaS, Clinics"
                width="md"
              />
            </FieldStack>
            <FieldStack label="Company size">
              <TextField
                value={value.companySize ?? ""}
                onChange={(v) => onChange({ ...value, companySize: v })}
                placeholder="e.g. 5–25 staff, £1–5M rev"
                width="md"
              />
            </FieldStack>
            <FieldStack label="Role you sell to">
              <TextField
                value={value.role ?? ""}
                onChange={(v) => onChange({ ...value, role: v })}
                placeholder="e.g. Owner, Head of Sales"
                width="md"
              />
            </FieldStack>
          </div>
          <FieldStack label="Situation when they come to you">
            <OptionalText
              value={value.situation ?? ""}
              onChange={(v) => onChange({ ...value, situation: v })}
              placeholder="What's happening in the business when they reach out?"
              rows={2}
            />
          </FieldStack>
          <FieldStack label="Mindset / what they're thinking">
            <OptionalText
              value={value.mindset ?? ""}
              onChange={(v) => onChange({ ...value, mindset: v })}
              placeholder="What's on their mind — frustrations, hopes, fears?"
              rows={2}
            />
          </FieldStack>
        </div>
      </Question>
      <Question label="Do you have your ICP / persona written down?">
        <MaturitySpectrum
          steps={ICP_WRITTEN}
          value={value.written ?? null}
          onChange={(k) => onChange({ ...value, written: k })}
        />
      </Question>
      <Question label="How did you arrive at that ICP?">
        <Segmented
          options={ICP_BASIS}
          value={value.basis ?? null}
          onChange={(k) => onChange({ ...value, basis: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 2: Problem & pain clarity ─────────

function ProblemStep({
  value,
  onChange,
}: {
  value: MessagingProblemAnswers;
  onChange: (next: MessagingProblemAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Problem & pain clarity"
      />
      <Question
        label="What's the most painful problem you solve for them?"
        hint="In their language. Write it the way a client would say it out loud."
      >
        <OptionalText
          value={value.painfulProblem ?? ""}
          onChange={(v) => onChange({ ...value, painfulProblem: v })}
          placeholder="The problem, in their words."
          rows={3}
        />
      </Question>
      <Question label="Is your messaging in the client's language?">
        <Segmented
          options={YES_SOMEWHAT_NO}
          value={value.clientLanguage ?? null}
          onChange={(k) => onChange({ ...value, clientLanguage: k })}
        />
      </Question>
      <Question label="Do prospects recognise themselves in your messaging?">
        <Segmented
          options={RECOGNITION}
          value={value.selfRecognition ?? null}
          onChange={(k) => onChange({ ...value, selfRecognition: k })}
        />
      </Question>
      <Question label="What level of pain are you speaking to?">
        <Segmented
          options={MESSAGE_LEVEL}
          value={value.messageLevel ?? null}
          onChange={(k) => onChange({ ...value, messageLevel: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 3: Value proposition ─────────

function ValueStep({
  value,
  onChange,
}: {
  value: MessagingValueAnswers;
  onChange: (next: MessagingValueAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Value proposition"
      />
      <Question
        label="Your value proposition"
        hint="The outcome you deliver, who it's for, and roughly how long it takes."
      >
        <div className="flex flex-col gap-4">
          <FieldStack label="Outcome you deliver">
            <OptionalText
              value={value.outcome ?? ""}
              onChange={(v) => onChange({ ...value, outcome: v })}
              placeholder="What changes for the client after working with you?"
              rows={2}
            />
          </FieldStack>
          <div className="flex flex-wrap gap-4">
            <FieldStack label="For whom">
              <TextField
                value={value.forWhom ?? ""}
                onChange={(v) => onChange({ ...value, forWhom: v })}
                placeholder="e.g. growing trades businesses"
                width="md"
              />
            </FieldStack>
            <FieldStack label="Timeframe">
              <TextField
                value={value.timeframe ?? ""}
                onChange={(v) => onChange({ ...value, timeframe: v })}
                placeholder="e.g. within 90 days"
                width="md"
              />
            </FieldStack>
          </div>
        </div>
      </Question>
      <Question
        label="Write your value proposition in one or two sentences, no jargon."
        hint="The version you'd say out loud."
      >
        <OptionalText
          value={value.oneSentence ?? ""}
          onChange={(v) => onChange({ ...value, oneSentence: v })}
          placeholder="In one or two sentences…"
          rows={3}
        />
      </Question>
      <Question
        label="How you're different"
        hint="What sets you apart — and whether prospects can actually see it."
      >
        <div className="flex flex-col gap-4">
          <FieldStack label="What makes you different">
            <OptionalText
              value={value.differentiation ?? ""}
              onChange={(v) => onChange({ ...value, differentiation: v })}
              placeholder="What's unique about how you do this?"
              rows={3}
            />
          </FieldStack>
          <FieldStack label="Can prospects tell?">
            <Segmented
              options={CAN_TELL}
              value={value.prospectsCanTell ?? null}
              onChange={(k) => onChange({ ...value, prospectsCanTell: k })}
            />
          </FieldStack>
        </div>
      </Question>
      <Question label="Are you mostly competing on price or on a clear unique advantage?">
        <Segmented
          options={COMPETE_BASIS}
          value={value.competeBasis ?? null}
          onChange={(k) => onChange({ ...value, competeBasis: k })}
        />
      </Question>
      <Question
        label="Why did your best clients really choose you?"
        hint="In their words, not yours."
      >
        <OptionalText
          value={value.bestClientReason ?? ""}
          onChange={(v) => onChange({ ...value, bestClientReason: v })}
          placeholder="What did they actually say?"
          rows={3}
        />
      </Question>
    </section>
  );
}

// ───────── Step 4: Proof & credibility ─────────

function ProofStep({
  value,
  onChange,
}: {
  value: MessagingProofAnswers;
  onChange: (next: MessagingProofAnswers) => void;
}) {
  const otherSelected = (value.evidenceTypes ?? []).includes("other");
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Proof & credibility"
      />
      <Question label="What types of evidence do you currently use?" hint="Pick all that apply.">
        <Chips
          options={EVIDENCE_TYPES}
          value={(value.evidenceTypes ?? []) as string[]}
          onChange={(next) => {
            const nextKeys = next as MessagingProofAnswers["evidenceTypes"];
            const stillHasOther = (nextKeys ?? []).includes("other");
            onChange({
              ...value,
              evidenceTypes: nextKeys,
              ...(stillHasOther ? {} : { evidenceOther: "" }),
            });
          }}
        />
        {otherSelected && (
          <div className="pt-3">
            <OptionalText
              value={value.evidenceOther ?? ""}
              onChange={(v) => onChange({ ...value, evidenceOther: v })}
              placeholder="What other evidence do you use?"
              rows={2}
            />
          </div>
        )}
      </Question>
      <Question label="How specific is your proof?">
        <Segmented
          options={PROOF_SPECIFICITY}
          value={value.proofSpecificity ?? null}
          onChange={(k) => onChange({ ...value, proofSpecificity: k })}
        />
      </Question>
      <Question label="How targeted is your proof to your ICP?">
        <Segmented
          options={PROOF_TARGETING}
          value={value.proofTargeting ?? null}
          onChange={(k) => onChange({ ...value, proofTargeting: k })}
        />
      </Question>
      <Question
        label="What would you show a sceptical prospect to prove you can do this?"
        hint="The exact thing you'd send."
      >
        <OptionalText
          value={value.skepticProof ?? ""}
          onChange={(v) => onChange({ ...value, skepticProof: v })}
          placeholder="The case study, number, screenshot, story…"
          rows={3}
        />
      </Question>
    </section>
  );
}

// ───────── Step 5: Message consistency ─────────

function ConsistencyStep({
  value,
  onChange,
}: {
  value: MessagingConsistencyAnswers;
  onChange: (next: MessagingConsistencyAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Message consistency"
      />
      <Question label="How consistent is your message across touchpoints?">
        <Segmented
          options={CONSISTENCY_LEVELS}
          value={value.crossChannel ?? null}
          onChange={(k) => onChange({ ...value, crossChannel: k })}
        />
      </Question>
      <Question label="When clients describe what you do, does it match your messaging?">
        <Segmented
          options={MATCH_LEVELS}
          value={value.clientDescriptionMatch ?? null}
          onChange={(k) => onChange({ ...value, clientDescriptionMatch: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Small layout helper ─────────

function FieldStack({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-ink-muted text-xs">{label}</span>
      {children}
    </div>
  );
}

// ───────── Step 6: Review & submit ─────────

function ReviewStep({
  icp,
  problem,
  value,
  proof,
  consistency,
  hasSubmitted,
  hasUnsubmittedChanges,
  submitting,
  onSubmit,
  error,
  submitLabel,
}: {
  icp: MessagingIcpAnswers;
  problem: MessagingProblemAnswers;
  value: MessagingValueAnswers;
  proof: MessagingProofAnswers;
  consistency: MessagingConsistencyAnswers;
  hasSubmitted: boolean;
  hasUnsubmittedChanges: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  submitLabel: string;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Review & submit"
      />

      <ReadGroup title="Ideal customer clarity">
        <ReadRow label="Industry" value={icp.industry?.trim() || "—"} />
        <ReadRow label="Company size" value={icp.companySize?.trim() || "—"} />
        <ReadRow label="Role" value={icp.role?.trim() || "—"} />
        <ReadText label="Situation" value={icp.situation} />
        <ReadText label="Mindset" value={icp.mindset} />
        <ReadRow label="Written down" value={labelOf(ICP_WRITTEN, icp.written)} />
        <ReadRow label="How arrived at" value={labelOf(ICP_BASIS, icp.basis)} />
      </ReadGroup>

      <ReadGroup title="Problem & pain clarity">
        <ReadText label="Most painful problem" value={problem.painfulProblem} />
        <ReadRow label="In client's language" value={labelOf(YES_SOMEWHAT_NO, problem.clientLanguage)} />
        <ReadRow label="Prospects recognise themselves" value={labelOf(RECOGNITION, problem.selfRecognition)} />
        <ReadRow label="Pain level" value={labelOf(MESSAGE_LEVEL, problem.messageLevel)} />
      </ReadGroup>

      <ReadGroup title="Value proposition">
        <ReadText label="Outcome delivered" value={value.outcome} />
        <ReadRow label="For whom" value={value.forWhom?.trim() || "—"} />
        <ReadRow label="Timeframe" value={value.timeframe?.trim() || "—"} />
        <ReadText label="One- or two-sentence value prop" value={value.oneSentence} />
        <ReadText label="What makes you different" value={value.differentiation} />
        <ReadRow label="Prospects can tell" value={labelOf(CAN_TELL, value.prospectsCanTell)} />
        <ReadRow label="Competing on" value={labelOf(COMPETE_BASIS, value.competeBasis)} />
        <ReadText label="Why best clients chose you" value={value.bestClientReason} />
      </ReadGroup>

      <ReadGroup title="Proof & credibility">
        <ReadRow
          label="Evidence types"
          value={chipsLabels(
            EVIDENCE_TYPES,
            proof.evidenceTypes as string[] | undefined,
            (proof.evidenceTypes ?? []).includes("other") ? proof.evidenceOther : undefined,
          )}
        />
        <ReadRow label="Proof specificity" value={labelOf(PROOF_SPECIFICITY, proof.proofSpecificity)} />
        <ReadRow label="Proof targeting" value={labelOf(PROOF_TARGETING, proof.proofTargeting)} />
        <ReadText label="What you'd show a sceptic" value={proof.skepticProof} />
      </ReadGroup>

      <ReadGroup title="Message consistency">
        <ReadRow
          label="Across touchpoints"
          value={labelOf(CONSISTENCY_LEVELS, consistency.crossChannel)}
        />
        <ReadRow
          label="Clients' description matches"
          value={labelOf(MATCH_LEVELS, consistency.clientDescriptionMatch)}
        />
      </ReadGroup>

      {hasSubmitted && hasUnsubmittedChanges && (
        <p className="text-ink-muted text-sm">
          You've changed your answers since last submission.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        onClick={onSubmit}
        disabled={submitting || (hasSubmitted && !hasUnsubmittedChanges)}
        className="w-fit active:scale-[0.97] transition-transform"
      >
        {submitting ? "Submitting…" : submitLabel}
      </Button>
    </section>
  );
}

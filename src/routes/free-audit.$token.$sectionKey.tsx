import { useCallback, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PublicAuditLayout,
  PublicAuditLoading,
} from "@/components/free-audit/PublicAuditLayout";
import {
  deriveCycleEcho,
  usePublicAuditSection,
} from "@/components/free-audit/usePublicAuditSection";
import { LEAD_AUDIT_SECTIONS, type LeadAuditSectionKey } from "@/lib/auditLeadPublic";
import { ConversionSectionForm } from "@/tools/selling-systems-audit/components/ConversionSectionForm";
import { PipelineSectionForm } from "@/tools/selling-systems-audit/components/PipelineSectionForm";
import { ProcessSectionForm } from "@/tools/selling-systems-audit/components/ProcessSectionForm";
import { ActivitySectionForm } from "@/tools/selling-systems-audit/components/ActivitySectionForm";
import { MessagingSectionForm } from "@/tools/selling-systems-audit/components/MessagingSectionForm";
import { AlignmentSectionForm } from "@/tools/selling-systems-audit/components/AlignmentSectionForm";
import type { IntakeAnswers } from "@/tools/selling-systems-audit/data/useConversionReview";
import type { PipelineAnswers } from "@/tools/selling-systems-audit/data/usePipelineReview";
import type { ProcessAnswers } from "@/tools/selling-systems-audit/data/useProcessReview";
import type { ActivityAnswers } from "@/tools/selling-systems-audit/data/useActivityReview";
import type { MessagingAnswers } from "@/tools/selling-systems-audit/data/useMessagingReview";
import type { AlignmentAnswers } from "@/tools/selling-systems-audit/data/useAlignmentReview";

export const Route = createFileRoute("/free-audit/$token/$sectionKey")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Audit section — Sales Lab" },
      { name: "description", content: "Answer one section of your Selling Systems Audit." },
      { property: "og:title", content: "Audit section — Sales Lab" },
      {
        property: "og:description",
        content: "Answer one section of your Selling Systems Audit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FreeAuditSection,
});

const SECTION_TITLES: Record<LeadAuditSectionKey, string> = {
  conversion: "Sales Conversion Rates Review",
  pipeline: "Pipeline Health",
  process: "Sales Process",
  activity: "Sales Activity Metrics",
  messaging: "Messaging & Positioning",
  alignment: "Marketing & Sales Alignment",
};

function isSectionKey(value: string): value is LeadAuditSectionKey {
  return LEAD_AUDIT_SECTIONS.some((section) => section.key === value);
}

function NotValid() {
  return (
    <PublicAuditLayout>
      <section className="flex min-h-[32rem] max-w-md flex-col justify-center gap-5">
        <h1 className="text-3xl font-semibold">This link isn't valid</h1>
        <p className="text-ink-muted">
          It may have been copied incorrectly. You can start a new audit instead.
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/free-audit">Start a new audit</Link>
        </Button>
      </section>
    </PublicAuditLayout>
  );
}

function FreeAuditSection() {
  const { token, sectionKey } = Route.useParams();
  const navigate = useNavigate();
  const valid = isSectionKey(sectionKey);
  const key = (valid ? sectionKey : "conversion") as LeadAuditSectionKey;

  const goToHub = useCallback(() => {
    void navigate({ to: "/free-audit/$token", params: { token } });
  }, [navigate, token]);

  const audit = usePublicAuditSection(token, key, goToHub);

  useEffect(() => {
    if (audit.isCompleted) {
      void navigate({
        to: "/free-audit/$token/done",
        params: { token },
        replace: true,
      });
    }
  }, [audit.isCompleted, navigate, token]);

  if (!valid) return <NotValid />;
  if (audit.isLoading) return <PublicAuditLoading />;
  if (audit.isInvalid) return <NotValid />;
  if (audit.isCompleted) return <PublicAuditLoading />;

  const backSlot = (
    <Link
      to="/free-audit/$token"
      params={{ token }}
      className="inline-flex w-fit items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ArrowLeft className="size-4" />
      Back to your audit
    </Link>
  );

  const renderReceived = ({ onEdit }: { onEdit: () => void }) => (
    <section className="flex flex-col items-start gap-5 rounded-xl border border-border px-8 py-10">
      <h2 className="text-xl" style={{ letterSpacing: "-0.01em" }}>
        Received
      </h2>
      <p className="max-w-prose text-sm text-ink-muted">
        Thanks — this section is saved. You can update your answers any time before
        you finish; submit again and the new version replaces the old.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={onEdit}
          className="transition-transform active:scale-[0.97]"
        >
          Edit my answers
        </Button>
        <Button
          asChild
          className="bg-red text-white transition-transform hover:bg-red/90 active:scale-[0.97]"
        >
          <Link to="/free-audit/$token" params={{ token }}>
            Back to your audit
          </Link>
        </Button>
      </div>
    </section>
  );

  const shared = {
    title: SECTION_TITLES[key],
    hasUnsubmittedChanges: audit.section.has_unsubmitted_changes,
    submittedAt: audit.section.submitted_at,
    isLoading: false,
    canPersist: true,
    isSubmitting: audit.isSubmitting,
    backSlot,
    renderReceived,
  };

  const neutralCurrency = {
    currency: null,
    currencyLoading: false,
    onCurrencyChange: () => {},
  };

  const liveCurrency = {
    currency: audit.currency,
    currencyLoading: audit.currencyLoading,
    onCurrencyChange: audit.onCurrencyChange,
  };

  let form: React.ReactNode = null;

  if (key === "conversion") {
    form = (
      <ConversionSectionForm
        {...shared}
        {...liveCurrency}
        draftAnswers={audit.section.draft_answers as IntakeAnswers | null}
        submittedAnswers={audit.section.submitted_answers as IntakeAnswers | null}
        saveDraft={(draft, hasSubmitted) => audit.saveDraft(draft, hasSubmitted)}
        submitSection={(draft) => audit.submitSection(draft)}
      />
    );
  } else if (key === "pipeline") {
    form = (
      <PipelineSectionForm
        {...shared}
        {...liveCurrency}
        draftAnswers={audit.section.draft_answers as PipelineAnswers | null}
        submittedAnswers={audit.section.submitted_answers as PipelineAnswers | null}
        saveDraft={(draft, hasSubmitted) => audit.saveDraft(draft, hasSubmitted)}
        submitSection={(draft) => audit.submitSection(draft)}
        cycleEcho={deriveCycleEcho(audit.allSections?.conversion?.draft_answers ?? null)}
      />
    );
  } else if (key === "process") {
    form = (
      <ProcessSectionForm
        {...shared}
        {...neutralCurrency}
        draftAnswers={audit.section.draft_answers as ProcessAnswers | null}
        submittedAnswers={audit.section.submitted_answers as ProcessAnswers | null}
        saveDraft={(draft, hasSubmitted) => audit.saveDraft(draft, hasSubmitted)}
        submitSection={(draft) => audit.submitSection(draft)}
      />
    );
  } else if (key === "activity") {
    form = (
      <ActivitySectionForm
        {...shared}
        {...neutralCurrency}
        draftAnswers={audit.section.draft_answers as ActivityAnswers | null}
        submittedAnswers={audit.section.submitted_answers as ActivityAnswers | null}
        saveDraft={(draft, hasSubmitted) => audit.saveDraft(draft, hasSubmitted)}
        submitSection={(draft) => audit.submitSection(draft)}
      />
    );
  } else if (key === "messaging") {
    form = (
      <MessagingSectionForm
        {...shared}
        {...neutralCurrency}
        draftAnswers={audit.section.draft_answers as MessagingAnswers | null}
        submittedAnswers={audit.section.submitted_answers as MessagingAnswers | null}
        saveDraft={(draft, hasSubmitted) => audit.saveDraft(draft, hasSubmitted)}
        submitSection={(draft) => audit.submitSection(draft)}
      />
    );
  } else {
    form = (
      <AlignmentSectionForm
        {...shared}
        {...neutralCurrency}
        draftAnswers={audit.section.draft_answers as AlignmentAnswers | null}
        submittedAnswers={audit.section.submitted_answers as AlignmentAnswers | null}
        saveDraft={(draft, hasSubmitted) => audit.saveDraft(draft, hasSubmitted)}
        submitSection={(draft) => audit.submitSection(draft)}
      />
    );
  }

  return (
    <PublicAuditLayout>
      {audit.saveError ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-ink">{audit.saveError}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void audit.retrySave()}
            className="w-fit shrink-0 transition-transform active:scale-[0.97]"
          >
            Try again
          </Button>
        </div>
      ) : null}
      {form}
    </PublicAuditLayout>
  );
}

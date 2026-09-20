import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PublicAuditLayout,
  PublicAuditLoading,
} from "@/components/free-audit/PublicAuditLayout";
import {
  fetchLeadAuditState,
  LEAD_AUDIT_SECTIONS,
  type LeadAuditSectionState,
} from "@/lib/auditLead.client";

export const Route = createFileRoute("/free-audit/$token/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your Selling Systems Audit — Sales Lab" },
      { name: "description", content: "Continue your private Selling Systems Audit." },
      { property: "og:title", content: "Your Selling Systems Audit — Sales Lab" },
      { property: "og:description", content: "Continue your private Selling Systems Audit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FreeAuditHub,
});

type DisplayStatus = "Not started" | "In progress" | "Completed";

function hasContent(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function sectionStatus(section: LeadAuditSectionState): DisplayStatus {
  if (section.submitted_at) return "Completed";
  if (
    hasContent(section.draft_answers) ||
    hasContent(section.submitted_answers) ||
    section.has_unsubmitted_changes
  ) {
    return "In progress";
  }
  return "Not started";
}

function FreeAuditHub() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [privateUrl, setPrivateUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const query = useQuery({
    queryKey: ["public-lead-audit", token],
    queryFn: () => fetchLeadAuditState(token),
    retry: false,
  });

  useEffect(() => {
    setPrivateUrl(`${window.location.origin}/free-audit/${encodeURIComponent(token)}`);
  }, [token]);

  useEffect(() => {
    if (query.data?.ok && query.data.status === "completed") {
      void navigate({
        to: "/free-audit/$token/done",
        params: { token },
        replace: true,
      });
    }
  }, [navigate, query.data, token]);

  if (query.isLoading) return <PublicAuditLoading />;

  if (!query.data?.ok) {
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

  if (query.data.status === "completed") return <PublicAuditLoading />;

  const firstName = query.data.name?.trim().split(/\s+/)[0] || "there";
  const statuses = LEAD_AUDIT_SECTIONS.map(({ key, label }) => ({
    key,
    label,
    status: sectionStatus(query.data.sections[key]),
  }));
  const completed = statuses.filter((section) => section.status === "Completed").length;

  const copyPrivateLink = async () => {
    if (!privateUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(privateUrl);
      } else {
        const temporary = document.createElement("textarea");
        temporary.value = privateUrl;
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.appendChild(temporary);
        temporary.select();
        const copied = document.execCommand("copy");
        temporary.remove();
        if (!copied) throw new Error("copy_failed");
      }
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <PublicAuditLayout>
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-muted">Selling Systems Audit</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Welcome, {firstName}</h1>
          <p className="text-ink-muted">Work through each section in order, or return to any section later.</p>
        </div>
        <div className="flex flex-col gap-3" aria-label={`${completed} of 6 sections completed`}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium text-ink">Overall progress</span>
            <span className="text-sm text-ink-muted">{completed} of 6 completed</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
            {LEAD_AUDIT_SECTIONS.map((section, index) => (
              <span
                key={section.key}
                className={`h-2 rounded-md ${index < completed ? "bg-ink" : "bg-surface-raised"}`}
              />
            ))}
          </div>
        </div>
      </header>

      <ol className="divide-y divide-border border-y border-border">
        {statuses.map((section, index) => (
          <li key={section.key}>
            <a
              href={`/free-audit/${encodeURIComponent(token)}/${section.key}`}
              className="group flex min-h-[5rem] items-center gap-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="w-7 shrink-0 text-sm font-medium text-ink-muted" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 text-base font-medium text-ink">{section.label}</span>
              <span className="shrink-0 text-right text-sm text-ink-muted">{section.status}</span>
              <ArrowUpRight className="size-4 shrink-0 text-ink-muted transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-4 rounded-xl bg-surface-raised p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Your private link</h2>
          <p className="text-sm text-ink-muted">
            Keep this link to return on another device. Anyone with it can open your audit.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            readOnly
            value={privateUrl}
            aria-label="Private audit link"
            onFocus={(event) => event.currentTarget.select()}
            className="h-11 min-w-0 rounded-lg bg-background text-sm"
          />
          <Button type="button" variant="outline" onClick={copyPrivateLink} className="shrink-0">
            {copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copyState === "copied" ? "Copied" : "Copy link"}
          </Button>
        </div>
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {copyState === "copied"
            ? "Link copied."
            : copyState === "failed"
              ? "Copying was blocked. Select the link above and copy it manually."
              : ""}
        </p>
      </section>
    </PublicAuditLayout>
  );
}
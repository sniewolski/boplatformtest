import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicAuditLayout } from "@/components/free-audit/PublicAuditLayout";
import {
  readStoredLeadAuditToken,
  storeLeadAuditToken,
} from "@/lib/auditLeadPublic";

export const Route = createFileRoute("/free-audit/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Free Selling Systems Audit — Sales Lab" },
      {
        name: "description",
        content: "Start the Sales Lab Selling Systems Audit.",
      },
      { property: "og:title", content: "Free Selling Systems Audit — Sales Lab" },
      {
        property: "og:description",
        content: "Start the Sales Lab Selling Systems Audit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FreeAuditStart,
});

type FieldErrors = { name?: string; email?: string; form?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FreeAuditStart() {
  const navigate = useNavigate();
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = readStoredLeadAuditToken();
    if (token?.trim()) setStoredToken(token.trim());
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) nextErrors.name = "Please enter your name.";
    if (!cleanEmail) nextErrors.email = "Please enter your email address.";
    else if (!EMAIL_PATTERN.test(cleanEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch("/api/public/audit-lead/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, company }),
      });
      const data = (await response.json()) as { ok?: boolean; token?: string | null };
      if (!response.ok || !data.ok) throw new Error("start_failed");
      if (!data.token) return;

      storeLeadAuditToken(data.token);
      await navigate({ to: "/free-audit/$token", params: { token: data.token } });
    } catch {
      setErrors({ form: "We couldn't start your audit. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicAuditLayout>
      <div className="flex max-w-xl flex-col gap-5">
        {storedToken ? (
          <Link
            to="/free-audit/$token"
            params={{ token: storedToken }}
            className="w-fit text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out hover:text-ink-muted"
          >
            Continue where you left off
          </Link>
        ) : (
          <div className="h-5" aria-hidden="true" />
        )}

        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold sm:text-4xl">See where your sales system needs work</h1>
          <p className="text-base text-ink-muted sm:text-lg">
            This practical audit covers six parts of your sales system and takes
            around 20 minutes. You can pause and return at any time.
          </p>
        </header>
      </div>

      <form className="flex w-full max-w-lg flex-col gap-6" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="free-audit-name">Name</Label>
          <Input
            id="free-audit-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "free-audit-name-error" : undefined}
            disabled={submitting}
            className="h-12 rounded-xl px-4"
          />
          <p id="free-audit-name-error" className="min-h-5 text-sm text-ink-muted" aria-live="polite">
            {errors.name ?? ""}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="free-audit-email">Email</Label>
          <Input
            id="free-audit-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="free-audit-email-note free-audit-email-error"
            disabled={submitting}
            className="h-12 rounded-xl px-4"
          />
          <p id="free-audit-email-note" className="text-sm text-ink-muted">
             We need your name and email to know where to send your 30-day plan.
          </p>
          <p id="free-audit-email-error" className="min-h-5 text-sm text-ink-muted" aria-live="polite">
            {errors.email ?? ""}
          </p>
        </div>

        <div className="sr-only" aria-hidden="true">
          <Label htmlFor="free-audit-company">Company</Label>
          <Input
            id="free-audit-company"
            name="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-fit">
            {submitting ? "Starting…" : "Start the audit"}
            {!submitting ? <ArrowRight aria-hidden="true" /> : null}
          </Button>
          <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
            {errors.form ?? ""}
          </p>
        </div>
      </form>
    </PublicAuditLayout>
  );
}
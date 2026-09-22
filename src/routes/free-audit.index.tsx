import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicAuditLayout } from "@/components/free-audit/PublicAuditLayout";
import {
  LEAD_AUDIT_CONSENT_LABEL,
  LEAD_AUDIT_SUBMISSIONS_CLOSED,
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

type FieldErrors = {
  name?: string;
  email?: string;
  consent?: string;
  form?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(value: string): string | undefined {
  return value.trim() ? undefined : "Please enter your name.";
}

function validateEmail(value: string): string | undefined {
  const clean = value.trim().toLowerCase();
  if (!clean) return "Please enter your email address.";
  if (!EMAIL_PATTERN.test(clean)) return "Please enter a valid email address.";
  return undefined;
}

/** Faint red panel so errors read as errors, not helper text. */
function ErrorSlot({ id, message }: { id: string; message?: string }) {
  return (
    <div id={id} aria-live="polite" className="min-h-5">
      {message ? (
        <p className="rounded-xl bg-red-tint px-3 py-2 text-sm text-red-pressed">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function FreeAuditStart() {
  const navigate = useNavigate();
  const consentRef = useRef<HTMLButtonElement>(null);
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const submissionsClosed = LEAD_AUDIT_SUBMISSIONS_CLOSED;

  useEffect(() => {
    const token = readStoredLeadAuditToken();
    if (token?.trim()) setStoredToken(token.trim());
  }, []);

  const showConsentError = () => {
    setErrors((current) => ({
      ...current,
      consent: "Please tick this box to start the audit.",
    }));
    consentRef.current?.focus();
  };

  // Mouse/touch only: the shadcn button sets pointer-events:none while
  // disabled, so the click lands on this wrapper instead of vanishing.
  const handleWrapperClick = () => {
    if (submitting || submissionsClosed) return;
    if (!consent) showConsentError();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionsClosed) return;
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const nextErrors: FieldErrors = {};
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;
    if (!consent) nextErrors.consent = "Please tick this box to start the audit.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (!consent) consentRef.current?.focus();
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch("/api/public/audit-lead/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          consent: true,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; token?: string | null };
      if (!response.ok || !data.ok || !data.token) throw new Error("start_failed");

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
            This audit takes around 20 minutes. You can pause and return at any time.
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
              const value = event.target.value;
              setName(value);
              if (errors.name) {
                setErrors((current) => ({ ...current, name: validateName(value) }));
              }
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "free-audit-name-error" : undefined}
            disabled={submitting}
            className="h-12 rounded-xl px-4"
          />
          <ErrorSlot id="free-audit-name-error" message={errors.name} />
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
              const value = event.target.value;
              setEmail(value);
              if (errors.email) {
                setErrors((current) => ({ ...current, email: validateEmail(value) }));
              }
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="free-audit-email-note free-audit-email-error"
            disabled={submitting}
            className="h-12 rounded-xl px-4"
          />
          <p id="free-audit-email-note" className="text-sm text-ink-muted">
             We need your name and email to know where to send your 30-day plan.
          </p>
          <ErrorSlot id="free-audit-email-error" message={errors.email} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <Checkbox
              ref={consentRef}
              id="free-audit-consent"
              checked={consent}
              onCheckedChange={(checked) => {
                setConsent(checked === true);
                if (checked === true && errors.consent) {
                  setErrors((current) => ({ ...current, consent: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={
                errors.consent ? "free-audit-consent-error" : undefined
              }
              disabled={submitting}
              className="mt-0.5"
            />
            <Label
              htmlFor="free-audit-consent"
              className="text-sm font-normal leading-relaxed text-ink-muted cursor-pointer"
            >
              {LEAD_AUDIT_CONSENT_LABEL}
            </Label>
          </div>
          <ErrorSlot id="free-audit-consent-error" message={errors.consent} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="w-full sm:w-fit" onClick={handleWrapperClick}>
            <Button
              type="submit"
              size="lg"
              disabled={submitting || !consent}
              className="w-full sm:w-fit"
            >
              {submitting ? "Starting…" : "Start the audit"}
              {!submitting ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </div>
          <ErrorSlot id="free-audit-form-error" message={errors.form} />
        </div>
      </form>
    </PublicAuditLayout>
  );
}

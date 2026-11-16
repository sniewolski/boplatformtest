import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/unsubscribe")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Unsubscribe — Sales Lab" },
      { name: "description", content: "Stop receiving Sales Lab notification emails." },
      { property: "og:title", content: "Unsubscribe — Sales Lab" },
      { property: "og:description", content: "Stop receiving Sales Lab notification emails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

type State = "checking" | "ready" | "submitting" | "done" | "already" | "invalid" | "error";

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>(token ? "checking" : "invalid");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const data = (await res.json().catch(() => ({}))) as { valid?: boolean; reason?: string };
        if (cancelled) return;
        if (res.ok && data.valid) setState("ready");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function confirm() {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; reason?: string };
      if (res.ok && data.success !== false) setState("done");
      else if (data.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-sm flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-ink font-semibold"
            style={{ letterSpacing: "-0.02em" }}
          >
            <img src={logoAsset.url} alt="" className="size-6 shrink-0" />
            Sales Lab
          </Link>
          <h1 className="text-2xl">Email notifications</h1>
        </header>

        <div className="flex flex-col gap-4" aria-live="polite">
          {state === "checking" && <p className="text-ink-muted text-sm">Checking your link…</p>}

          {(state === "ready" || state === "submitting") && (
            <>
              <p className="text-ink-muted text-sm">
                Unsubscribe from Sales Lab notification emails? Sign-in emails will still arrive.
              </p>
              <Button onClick={confirm} disabled={state === "submitting"}>
                {state === "submitting" ? "Unsubscribing…" : "Confirm unsubscribe"}
              </Button>
            </>
          )}

          {state === "done" && (
            <p className="text-ink-muted text-sm">
              You've been unsubscribed. You won't receive Sales Lab notification emails any more.
            </p>
          )}

          {state === "already" && (
            <p className="text-ink-muted text-sm">You're already unsubscribed from these emails.</p>
          )}

          {state === "invalid" && (
            <p className="text-ink-muted text-sm">
              This unsubscribe link isn't valid or has expired.
            </p>
          )}

          {state === "error" && (
            <p className="text-sm text-[var(--red)]">
              Something went wrong. Please try the link again in a moment.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

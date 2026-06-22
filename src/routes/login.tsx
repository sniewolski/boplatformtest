import { useState } from "react";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { devLoginBypass } from "@/lib/dev-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Platform" },
      { name: "description", content: "Sign in to your private workspace." },
    ],
  }),
  component: LoginPage,
});

type Step = "email" | "code";

const DEV_CODE = "000000";

function LoginPage() {
  const router = useRouter();
  const runDevBypass = useServerFn(devLoginBypass);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    // Fire-and-forget: try real OTP in case email is configured, but the
    // dev code 000000 always works regardless.
    void supabase.auth
      .signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
      .catch(() => {});
    setPending(false);
    setNotice(`Email delivery isn't configured yet — use code ${DEV_CODE} to sign in.`);
    setStep("code");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const trimmed = code.trim();
    try {
      if (trimmed === DEV_CODE) {
        const { token } = await runDevBypass({
          data: { email: email.trim(), code: trimmed },
        });
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token,
          type: "magiclink",
        });
        if (verifyErr) throw new Error(verifyErr.message);
      } else {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: trimmed,
          type: "email",
        });
        if (verifyErr) throw new Error(verifyErr.message);
      }
      router.navigate({ to: "/app" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That code didn't work. Check it or request a new one.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-sm flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link
            to="/"
            className="text-ink font-semibold"
            style={{ letterSpacing: "-0.02em" }}
          >
            Platform
          </Link>
          <h1 className="text-2xl">Sign in</h1>
          <p className="text-ink-muted text-sm">
            Access is invite-only. Enter your registered email and we'll send a one-time code.
          </p>
        </header>

        {step === "email" ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <Button type="submit" disabled={pending || !email}>
              {pending ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            {notice && <p className="text-sm text-ink-muted">{notice}</p>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Sign-in code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={pending}
              />
            </div>
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <Button type="submit" disabled={pending || !code}>
              {pending ? "Verifying…" : "Verify and sign in"}
            </Button>
            <button
              type="button"
              className="text-sm text-ink-muted hover:text-ink text-left"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setNotice(null);
              }}
              disabled={pending}
            >
              Use a different email
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

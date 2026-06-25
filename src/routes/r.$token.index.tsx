import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicSession } from "@/lib/respondent.types";

export const Route = createFileRoute("/r/$token/")({
  ssr: false,
  component: RespondentEntry,
});

async function fetchValidate(token: string) {
  const res = await fetch("/api/public/r/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = (await res.json()) as
    | { ok: true; session: PublicSession }
    | { ok: false; reason: string };
  return json;
}

function RespondentEntry() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["respondent", token],
    queryFn: () => fetchValidate(token),
    retry: false,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const session = query.data && query.data.ok ? query.data.session : null;

  const capture = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/r/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Capture failed");
      }
      return (await res.json()) as { ok: true; session: PublicSession };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["respondent", token], data);
      // Hand off to the per-tool splat route.
      navigate({
        to: "/r/$token/$",
        params: { token, _splat: "run" },
      });
    },
  });

  // If they already captured (e.g. returning later), forward to the tool.
  if (
    session &&
    session.respondentName &&
    session.respondentEmail &&
    session.status !== "completed"
  ) {
    navigate({ to: "/r/$token/$", params: { token, _splat: "run" } });
  }
  if (session && session.status === "completed") {
    navigate({ to: "/r/$token/$", params: { token, _splat: "done" } });
  }

  if (query.isLoading) {
    return (
      <Centered>
        <p className="text-ink-muted text-sm">Loading…</p>
      </Centered>
    );
  }

  if (!query.data || !query.data.ok) {
    const reason = query.data && !query.data.ok ? query.data.reason : "not_found";
    return (
      <Centered>
        <h1 className="text-2xl">Link unavailable</h1>
        <p className="text-ink-muted text-sm">
          {reason === "expired"
            ? "This link has expired."
            : reason === "revoked"
              ? "This link has been revoked."
              : "We couldn't find a session for this link."}
        </p>
      </Centered>
    );
  }

  return (
    <Centered>
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl">You've been invited</h1>
        <p className="text-ink-muted text-sm">Enter your details to begin.</p>
      </header>
      <form
        className="w-full flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          capture.mutate();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="resp-name">Your name</Label>
          <Input
            id="resp-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={capture.isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="resp-email">Email</Label>
          <Input
            id="resp-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={capture.isPending}
          />
        </div>
        {capture.error && (
          <p className="text-sm text-red">{(capture.error as Error).message}</p>
        )}
        <Button type="submit" disabled={capture.isPending || !name || !email}>
          {capture.isPending ? "Saving…" : "Continue"}
        </Button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-sm flex flex-col items-center text-center gap-6">
        {children}
      </section>
    </main>
  );
}

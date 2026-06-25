import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicSession } from "@/lib/respondent.types";
import { SalesCodeQuestionFlow } from "@/tools/salescode/components/SalesCodeQuestionFlow";
import { SalesCodeResultView } from "@/tools/salescode/components/SalesCodeResultView";
import { scoreSalesCode } from "@/tools/salescode/lib/scoring";
import type { AnswerMap, SalesCodeResult } from "@/tools/salescode/lib/types";

export const Route = createFileRoute("/r/$token/$")({
  ssr: false,
  component: RespondentSplat,
});

type StateResp =
  | { ok: true; session: PublicSession; payload: unknown; result: unknown }
  | { ok: false; reason: string };

async function fetchState(token: string): Promise<StateResp> {
  const res = await fetch("/api/public/r/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return (await res.json()) as StateResp;
}

function RespondentSplat() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["respondent-state", token],
    queryFn: () => fetchState(token),
    retry: false,
  });

  // If they haven't captured yet, send them back to the entry to do that.
  const session = query.data && query.data.ok ? query.data.session : null;
  useEffect(() => {
    if (!session) return;
    const captured = !!session.respondentName && !!session.respondentEmail;
    if (!captured) {
      navigate({ to: "/r/$token", params: { token } });
    }
  }, [session, navigate, token]);

  if (query.isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-ink-muted text-sm">Loading…</p>
      </main>
    );
  }

  if (!query.data || !query.data.ok) {
    return <UnavailableMessage />;
  }

  const s = query.data.session;
  const toolKey = s.toolKey;

  if (toolKey === "salescode") {
    return (
      <main className="min-h-screen bg-background py-12">
        <div className="app-content flex flex-col gap-6">
          <SalesCodeRespondent
            token={token}
            session={s}
            onCompleted={() => {
              void queryClient.invalidateQueries({
                queryKey: ["respondent", token],
              });
            }}
          />
        </div>
      </main>
    );
  }

  // Fallback for any other tool_key — nothing wired yet.
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center flex flex-col gap-4">
        <h1 className="text-2xl">Nothing here yet</h1>
        <p className="text-ink-muted text-sm">
          The respondent flow for this tool hasn't been built.
        </p>
      </section>
    </main>
  );
}

function UnavailableMessage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-sm flex flex-col items-center text-center gap-4">
        <h1 className="text-2xl">Link unavailable</h1>
        <p className="text-ink-muted text-sm">
          We couldn't load this session. Please request a fresh link.
        </p>
        <Link to="/" className="text-sm underline text-ink">
          Home
        </Link>
      </section>
    </main>
  );
}

function SalesCodeRespondent({
  token,
  session,
  onCompleted,
}: {
  token: string;
  session: PublicSession & { payload?: unknown; result?: unknown };
  onCompleted: () => void;
}) {
  const initialAnswers = useMemo<AnswerMap>(() => {
    const p = session.payload;
    if (p && typeof p === "object") return p as AnswerMap;
    return {};
  }, [session.payload]);

  const [completed, setCompleted] = useState<SalesCodeResult | null>(() => {
    if (session.status !== "completed") return null;
    const r = session.result as { type?: string; traits?: unknown } | null;
    if (r && r.type) return r as unknown as SalesCodeResult;
    return null;
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (payload: AnswerMap) => {
      const res = await fetch("/api/public/r/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, payload }),
      });
      if (!res.ok) throw new Error("Save failed");
    },
  });

  const complete = useMutation({
    mutationFn: async (result: SalesCodeResult) => {
      const res = await fetch("/api/public/r/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, result }),
      });
      if (!res.ok) throw new Error("Submit failed");
    },
  });

  const onSave = useCallback(
    async (draft: AnswerMap) => {
      await save.mutateAsync(draft);
    },
    [save],
  );

  const onSubmit = useCallback(
    async (final: AnswerMap) => {
      try {
        const result = scoreSalesCode(final);
        await complete.mutateAsync(result);
        setCompleted(result);
        onCompleted();
        if (typeof window !== "undefined") window.scrollTo({ top: 0 });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Submit failed");
      }
    },
    [complete, onCompleted],
  );

  if (completed) {
    return (
      <SalesCodeResultView
        result={completed}
        headerSlot={
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl text-ink">Thanks, {session.respondentName ?? "you"}</h1>
            <p className="text-ink-muted text-sm">
              Your SalesCode result is below. Your responses have been sent
              back to the person who shared this link.
            </p>
          </header>
        }
      />
    );
  }

  return (
    <SalesCodeQuestionFlow
      initialAnswers={initialAnswers}
      onSave={onSave}
      onSubmit={onSubmit}
      submitting={complete.isPending}
      submitError={submitError}
      intro={
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl text-ink" style={{ letterSpacing: "-0.01em" }}>
            SalesCode assessment
          </h1>
          <p className="text-ink-muted text-sm">
            Welcome{session.respondentName ? `, ${session.respondentName}` : ""}.
            Answer each statement honestly — there are no right answers. Your
            progress saves automatically; you can leave and come back at any
            time using this link.
          </p>
        </header>
      }
    />
  );
}

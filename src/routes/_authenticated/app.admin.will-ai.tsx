import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  type WillAiFailedPage,
  type WillAiSource,
  useDeleteWillAiSource,
  useRetryWillAiSource,
  useUploadWillAiSource,
  useWillAiChunkCounts,
  useWillAiSources,
  isPdfFile,
  WILL_AI_MAX_BYTES,
} from "@/lib/useWillAiSources";

export const Route = createFileRoute("/_authenticated/app/admin/will-ai")({
  component: WillAiAdmin,
});

function WillAiAdmin() {
  return (
    <div className="app-content py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Will AI</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Manage the source material Will draws from, and see where owners
          asked questions the material didn't cover.
        </p>
      </header>

      <Tabs defaultValue="sources" className="flex flex-col gap-6">
        <TabsList className="self-start">
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="gaps">Content gaps</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="mt-0">
          <SourcesTab />
        </TabsContent>
        <TabsContent value="gaps" className="mt-0">
          <ContentGapsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourcesTab() {
  const sources = useWillAiSources();
  const counts = useWillAiChunkCounts();

  const [deleteTarget, setDeleteTarget] = useState<WillAiSource | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const retryMut = useRetryWillAiSource();
  const deleteMut = useDeleteWillAiSource();

  const rows = sources.data ?? [];
  const isEmpty = !sources.isLoading && rows.length === 0;

  const totalToLose = useMemo(() => {
    if (!deleteTarget) return null;
    return counts.data?.[deleteTarget.id] ?? { text: 0, diagram: 0, total: 0 };
  }, [deleteTarget, counts.data]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-12">
      {sources.error && (
        <p className="text-sm text-[var(--red)]">
          {(sources.error as Error).message}
        </p>
      )}

      {isEmpty ? (
        <section className="flex flex-col gap-4 max-w-xl">
          <h2 className="text-xl">Upload the first source</h2>
          <p className="text-ink-muted text-sm">
            PDF only, up to {Math.round(WILL_AI_MAX_BYTES / 1024 / 1024)}MB.
          </p>
          <UploadForm />
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4 max-w-xl">
            <h2 className="text-xl">Upload a source</h2>
            <UploadForm />
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl">Sources</h2>
              <span className="text-ink-muted text-xs">
                {rows.length} total
              </span>
            </div>

            <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
              {rows.map((s) => {
                const c = counts.data?.[s.id];
                const failedCount = s.failed_pages?.length ?? 0;
                const isExpanded = expanded.has(s.id);
                const canExpand = failedCount > 0 || !!s.error_message;
                const isFailed = s.status === "failed";

                return (
                  <li key={s.id} className="flex flex-col px-5 py-4 gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col min-w-0 gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-ink text-sm truncate">
                            {s.title}
                          </span>
                          <StatusBadge status={s.status} />
                        </div>
                        <span className="text-ink-muted text-xs truncate">
                          {s.author ? `${s.author} · ` : ""}
                          {new Date(s.created_at).toLocaleDateString()}
                          {s.total_pages != null
                            ? ` · ${s.total_pages} pages`
                            : ""}
                          {c
                            ? ` · ${c.text} text, ${c.diagram} diagram`
                            : ""}
                        </span>
                        {failedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(s.id)}
                            className="inline-flex items-center gap-1.5 text-xs text-ink-muted w-fit underline-offset-2 hover:underline"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {failedCount} failed page
                            {failedCount === 1 ? "" : "s"} —{" "}
                            {isExpanded ? "hide" : "show"}
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {isFailed && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retryMut.isPending}
                            onClick={() => retryMut.mutate(s.id)}
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[var(--red)] hover:text-[var(--red)]"
                          onClick={() => setDeleteTarget(s)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {isFailed && s.error_message && (
                      <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/5 px-3 py-2">
                        <p className="text-xs text-[var(--red)] font-medium mb-1">
                          Error
                        </p>
                        <p className="text-xs text-ink whitespace-pre-wrap break-words">
                          {s.error_message}
                        </p>
                      </div>
                    )}

                    {canExpand && isExpanded && failedCount > 0 && (
                      <div className="rounded-lg border border-border bg-[var(--surface-raised)] px-3 py-2">
                        <p className="text-xs text-ink-muted mb-2">
                          Failed pages (skipped, source still usable):
                        </p>
                        <ul className="flex flex-col gap-1">
                          {s.failed_pages.map((fp: WillAiFailedPage, i) => (
                            <li
                              key={`${fp.page}-${i}`}
                              className="text-xs text-ink"
                            >
                              <span className="font-mono">p.{fp.page}</span>{" "}
                              <span className="text-ink-muted">
                                [{fp.stage}]
                              </span>{" "}
                              {fp.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete "{deleteTarget?.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the source PDF, any rendered diagram
              images, and{" "}
              {totalToLose
                ? `${totalToLose.total} chunk${totalToLose.total === 1 ? "" : "s"} (${totalToLose.text} text, ${totalToLose.diagram} diagram)`
                : "all associated chunks"}
              . Re-ingesting the same file will re-run the full processing
              cost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending || !deleteTarget}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                deleteMut.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
              className="bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete source"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadForm() {
  const upload = useUploadWillAiSource();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = upload.isPending || !title.trim() || !file;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!file) return;
        upload.mutate(
          {
            sourceType: "book",
            title: title.trim(),
            author: author.trim() || null,
            file,
          },
          {
            onSuccess: () => {
              setTitle("");
              setAuthor("");
              setFile(null);
              const el = document.getElementById(
                "will-ai-upload-file",
              ) as HTMLInputElement | null;
              if (el) el.value = "";
            },
            onError: (err: Error) => setError(err.message),
          },
        );
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="will-ai-title">Title</Label>
        <Input
          id="will-ai-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. SalesCode"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="will-ai-author">Author (optional)</Label>
        <Input
          id="will-ai-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="will-ai-upload-file">PDF file</Label>
        <Input
          id="will-ai-upload-file"
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && !isPdfFile(f)) {
              setError("Only PDF files are allowed.");
              setFile(null);
              return;
            }
            setError(null);
            setFile(f);
          }}
        />
      </div>
      {error && <p className="text-sm text-[var(--red)]">{error}</p>}
      <Button type="submit" disabled={disabled} className="w-fit">
        {upload.isPending ? "Uploading…" : "Upload & ingest"}
      </Button>
    </form>
  );
}

function StatusBadge({ status }: { status: WillAiSource["status"] }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide border";
  if (status === "failed") {
    return (
      <span
        className={`${base} bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/40 font-medium`}
      >
        failed
      </span>
    );
  }
  const neutral =
    "bg-[var(--surface-raised)] text-ink-muted border-border";
  if (status === "pending") {
    return (
      <span className={`${base} ${neutral}`}>
        <Clock className="w-3 h-3" />
        pending
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className={`${base} ${neutral} animate-pulse`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        processing
      </span>
    );
  }
  return (
    <span className={`${base} bg-[var(--surface-raised)] text-ink border-border`}>
      <Check className="w-3 h-3" />
      completed
    </span>
  );
}

// -------------------- content gaps --------------------

type ContentGap = {
  fallbackId: string;
  ownerId: string;
  ownerEmail: string | null;
  question: string | null;
  askedAt: string;
};

const CONTENT_GAPS_LIMIT = 50;

/**
 * "Content gaps" surfaces the questions Will couldn't answer from the
 * material — every assistant message flagged `used_fallback = true`, joined
 * back to the user message that triggered it (the user-role row immediately
 * before the fallback, by created_at, in the same conversation).
 *
 * We deliberately show the QUESTION, not the fallback's response text — the
 * response is the same canned closing line for every gap and reveals
 * nothing about what's missing from the material.
 *
 * Capped at the most recent 50 rows. No pagination, no reviewed/dismiss
 * state — this is pure read visibility (per spec).
 */
function useContentGaps() {
  return useQuery({
    queryKey: ["will-ai-content-gaps", CONTENT_GAPS_LIMIT],
    queryFn: async (): Promise<ContentGap[]> => {
      const { data: fallbacks, error: fbErr } = await supabase
        .from("will_ai_messages")
        .select("id, conversation_id, owner_id, created_at")
        .eq("role", "assistant")
        .eq("used_fallback", true)
        .order("created_at", { ascending: false })
        .limit(CONTENT_GAPS_LIMIT);
      if (fbErr) throw fbErr;
      const rows = (fallbacks ?? []) as Array<{
        id: string;
        conversation_id: string;
        owner_id: string;
        created_at: string;
      }>;
      if (rows.length === 0) return [];

      const conversationIds = Array.from(
        new Set(rows.map((r) => r.conversation_id)),
      );
      const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)));

      const [{ data: users, error: uErr }, { data: profiles }] =
        await Promise.all([
          supabase
            .from("will_ai_messages")
            .select("conversation_id, content, created_at")
            .eq("role", "user")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("profiles")
            .select("id, email")
            .in("id", ownerIds),
        ]);
      if (uErr) throw uErr;

      const userMsgsByConv = new Map<
        string,
        Array<{ content: string; created_at: string }>
      >();
      for (const u of (users ?? []) as any[]) {
        const list = userMsgsByConv.get(u.conversation_id) ?? [];
        list.push({ content: u.content, created_at: u.created_at });
        userMsgsByConv.set(u.conversation_id, list);
      }
      const emailById = new Map<string, string>();
      for (const p of (profiles ?? []) as any[]) emailById.set(p.id, p.email);

      return rows.map((r) => {
        const priors = userMsgsByConv.get(r.conversation_id) ?? [];
        // The triggering question is the last user message with created_at
        // strictly before the fallback's created_at.
        let question: string | null = null;
        for (const u of priors) {
          if (u.created_at < r.created_at) question = u.content;
          else break;
        }
        return {
          fallbackId: r.id,
          ownerId: r.owner_id,
          ownerEmail: emailById.get(r.owner_id) ?? null,
          question,
          askedAt: r.created_at,
        };
      });
    },
  });
}

function ContentGapsTab() {
  const gaps = useContentGaps();
  const rows = gaps.data ?? [];

  if (gaps.isLoading) {
    return <p className="text-ink-muted text-sm">Loading…</p>;
  }
  if (gaps.error) {
    return (
      <p className="text-sm text-[var(--red)]">
        {(gaps.error as Error).message}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 py-8">
        <p className="text-ink text-sm">No content gaps yet.</p>
        <p className="text-ink-muted text-xs max-w-prose">
          When a question can't be answered from the material, it'll show up
          here so you can decide what to add.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Recent unanswered questions</h2>
        <span className="text-ink-muted text-xs">
          {rows.length} shown · newest first
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
        {rows.map((g) => (
          <li key={g.fallbackId} className="flex flex-col px-5 py-4 gap-1.5">
            {g.question ? (
              <p className="text-ink text-sm whitespace-pre-wrap break-words">
                {g.question}
              </p>
            ) : (
              <p className="text-ink-muted text-sm italic">
                (question not found in conversation history)
              </p>
            )}
            <p className="text-ink-muted text-xs">
              {g.ownerEmail ?? g.ownerId} ·{" "}
              {new Date(g.askedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}


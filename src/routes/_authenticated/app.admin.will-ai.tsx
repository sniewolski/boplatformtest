import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Loader2, Youtube } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
import {
  useSetWillAiOwnerAccess,
  useWillAiSettings,
} from "@/lib/useWillAiSettings";
import {
  parseYouTubeInput,
  useImportYouTubeSources,
  useYouTubeQuota,
} from "@/lib/useWillAiYoutube";


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

      <OwnerAccessToggle />

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

/**
 * Admin-only switch that pauses/resumes owner access to the Will AI tool.
 * Does NOT affect this admin screen — admins retain full ingestion, retry,
 * delete, and content-gap access regardless of the flag.
 */
function OwnerAccessToggle() {
  const settings = useWillAiSettings();
  const setAccess = useSetWillAiOwnerAccess();
  const enabled = settings.data?.owner_access_enabled ?? true;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-[var(--surface-raised)] px-5 py-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-ink text-sm font-medium">Owner access</span>
        <span className="text-ink-muted text-xs">
          {settings.isLoading
            ? "Loading…"
            : enabled
              ? "Enabled — owners can use Will AI."
              : "Paused — Will AI is hidden and blocked for owners. Admins are unaffected."}
        </span>
      </div>
      <Switch
        checked={enabled}
        disabled={settings.isLoading || setAccess.isPending}
        onCheckedChange={(v) => setAccess.mutate(v)}
        aria-label="Toggle owner access to Will AI"
      />
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
      <YouTubeQuotaLine />

      {sources.error && (
        <p className="text-sm text-[var(--red)]">
          {(sources.error as Error).message}
        </p>
      )}


      {isEmpty ? (
        <section className="flex flex-col gap-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Upload the first PDF</h2>
              <p className="text-ink-muted text-sm">
                PDF only, up to {Math.round(WILL_AI_MAX_BYTES / 1024 / 1024)}MB.
              </p>
              <UploadForm />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Import from YouTube</h2>
              <YouTubeImportCard />
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Upload a PDF</h2>
              <UploadForm />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Import from YouTube</h2>
              <YouTubeImportCard />
            </div>
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

/**
 * Turn a PDF filename into a sensible default title.
 * Strips the extension, swaps underscores/hyphens for spaces, and collapses
 * whitespace. Deliberately does NOT touch capitalization — "SalesCode_Book.pdf"
 * must stay "SalesCode Book", not "Salescode Book".
 */
function filenameToTitle(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type BatchItem = {
  key: string;
  file: File;
  title: string;
};

type BatchResult = {
  filename: string;
  ok: boolean;
  error?: string;
};

function UploadForm() {
  const upload = useUploadWillAiSource();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<BatchResult[] | null>(null);

  const isBusy = progress !== null;
  const canSubmit =
    !isBusy && items.length > 0 && items.every((i) => i.title.trim().length > 0);

  function onFilesPicked(files: FileList | null) {
    setError(null);
    if (!files || files.length === 0) return;
    const next: BatchItem[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(files)) {
      if (!isPdfFile(f)) {
        rejected.push(`${f.name} (not a PDF)`);
        continue;
      }
      next.push({
        key: `${f.name}-${f.size}-${f.lastModified}-${crypto.randomUUID()}`,
        file: f,
        title: filenameToTitle(f.name),
      });
    }
    setItems((prev) => [...prev, ...next]);
    if (rejected.length) {
      setError(`Skipped: ${rejected.join(", ")}`);
    }
    // Reset the input so re-selecting the same file re-fires onChange.
    const el = document.getElementById(
      "will-ai-upload-file",
    ) as HTMLInputElement | null;
    if (el) el.value = "";
  }

  function updateTitle(key: string, title: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, title } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  async function submitBatch() {
    setError(null);
    setResults(null);
    if (items.length === 0) return;
    const batch = items;
    const outcome: BatchResult[] = [];
    setProgress({ current: 0, total: batch.length });
    for (let i = 0; i < batch.length; i++) {
      const it = batch[i];
      setProgress({ current: i + 1, total: batch.length });
      try {
        await upload.mutateAsync({
          sourceType: "book",
          title: it.title.trim(),
          author: null,
          file: it.file,
        });
        outcome.push({ filename: it.file.name, ok: true });
      } catch (e) {
        outcome.push({
          filename: it.file.name,
          ok: false,
          error: e instanceof Error ? e.message : "Upload failed",
        });
      }
    }
    setProgress(null);
    setResults(outcome);
    setItems([]);
  }

  const succeeded = results?.filter((r) => r.ok).length ?? 0;
  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submitBatch();
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="will-ai-upload-file">PDF files</Label>
        <Input
          id="will-ai-upload-file"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={isBusy}
          onChange={(e) => onFilesPicked(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 px-3 py-2">
              <div className="flex flex-col min-w-0 flex-1 gap-1">
                <Input
                  value={it.title}
                  onChange={(e) => updateTitle(it.key, e.target.value)}
                  disabled={isBusy}
                  placeholder="Title"
                />
                <span className="text-ink-muted text-xs truncate">
                  {it.file.name} · {(it.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={() => removeItem(it.key)}
                aria-label={`Remove ${it.file.name}`}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-[var(--red)]">{error}</p>}

      {progress && (
        <p className="text-sm text-ink-muted">
          Uploading {progress.current} of {progress.total}…
        </p>
      )}

      {results && (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-[var(--surface-raised)] px-3 py-2">
          <p className="text-sm text-ink">
            {succeeded} uploaded successfully, {failed.length} failed
          </p>
          {failed.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {failed.map((f, i) => (
                <li key={i} className="text-xs text-[var(--red)]">
                  {f.filename} — {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-fit">
        {isBusy
          ? `Uploading ${progress?.current} of ${progress?.total}…`
          : items.length > 1
            ? `Upload & ingest all (${items.length})`
            : "Upload & ingest"}
      </Button>
    </form>
  );
}

// -------------------- youtube import --------------------

/**
 * Simple text line above the source list showing the remaining
 * youtube-transcript.io quota for the current billing cycle. Not a new
 * visual pattern — matches existing admin screen typography.
 */
function YouTubeQuotaLine() {
  const q = useYouTubeQuota();
  if (q.isLoading) {
    return <p className="text-ink-muted text-xs">Loading YouTube quota…</p>;
  }
  if (q.error) {
    return (
      <p className="text-xs text-[var(--red)]">
        YouTube quota unavailable: {(q.error as Error).message}
      </p>
    );
  }
  const data = q.data;
  if (!data) return null;
  const remaining = Math.max(0, data.monthly_limit - data.used);
  const cycleLabel = data.cycle_start
    ? new Date(data.cycle_start).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "this month";
  return (
    <p className="text-ink-muted text-xs">
      YouTube transcripts: {remaining} / {data.monthly_limit} remaining for{" "}
      {cycleLabel}.
    </p>
  );
}

/**
 * One entry per line: video URL, channel URL, or playlist URL.
 * Parsing is done client-side (`parseYouTubeInput`) so the admin sees
 * the split into videos / channels / playlists / invalid before submitting.
 * The server fn expands channels/playlists, de-dupes, and enqueues.
 */
function YouTubeImportCard() {
  const [raw, setRaw] = useState("");
  const importMut = useImportYouTubeSources();
  const [lastResult, setLastResult] = useState<{
    queued: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const parsed = useMemo(() => parseYouTubeInput(raw), [raw]);
  const totalCount =
    parsed.videoIds.length +
    parsed.channelUrls.length +
    parsed.playlistUrls.length;
  const canSubmit = !importMut.isPending && totalCount > 0;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setLastResult(null);
        importMut.mutate(parsed, {
          onSuccess: (res) => {
            setLastResult(res);
            setRaw("");
          },
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="yt-import-input">
          YouTube URLs (one per line)
        </Label>
        <textarea
          id="yt-import-input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          placeholder={
            "https://www.youtube.com/watch?v=…\nhttps://www.youtube.com/@handle\nhttps://www.youtube.com/playlist?list=…"
          }
          disabled={importMut.isPending}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-[var(--red)] min-h-[120px]"
        />
      </div>

      {totalCount > 0 && (
        <div className="text-xs text-ink-muted flex flex-wrap gap-x-3 gap-y-1">
          {parsed.videoIds.length > 0 && (
            <span>{parsed.videoIds.length} video URL(s)</span>
          )}
          {parsed.channelUrls.length > 0 && (
            <span>{parsed.channelUrls.length} channel URL(s)</span>
          )}
          {parsed.playlistUrls.length > 0 && (
            <span>{parsed.playlistUrls.length} playlist URL(s)</span>
          )}
          {parsed.invalid.length > 0 && (
            <span className="text-[var(--red)]">
              {parsed.invalid.length} unrecognised line(s) — will be ignored
            </span>
          )}
        </div>
      )}

      {importMut.error && (
        <p className="text-sm text-[var(--red)]">
          {(importMut.error as Error).message}
        </p>
      )}

      {lastResult && (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-[var(--surface-raised)] px-3 py-2">
          <p className="text-sm text-ink">
            Queued {lastResult.queued}
            {lastResult.skipped > 0
              ? `, skipped ${lastResult.skipped} already-imported`
              : ""}
            {lastResult.errors.length > 0
              ? `, ${lastResult.errors.length} error(s)`
              : ""}
            .
          </p>
          {lastResult.errors.length > 0 && (
            <ul className="flex flex-col gap-0.5 mt-1">
              {lastResult.errors.map((e, i) => (
                <li key={i} className="text-xs text-[var(--red)] break-words">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-fit">
        <Youtube className="size-4" />
        {importMut.isPending
          ? "Importing…"
          : totalCount > 0
            ? `Import (${totalCount})`
            : "Import"}
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


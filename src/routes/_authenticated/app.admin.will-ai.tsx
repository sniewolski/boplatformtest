import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Loader2, Youtube } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import {
  useSopsWillAiStatus,
  useImportSopToWillAi,
  type SopWillAiRow,
} from "@/lib/useSopWillAiImport";
import {
  type WillAiCanonicalFact,
  useCreateWillAiCanonicalFact,
  useDeleteWillAiCanonicalFact,
  useUpdateWillAiCanonicalFact,
  useWillAiCanonicalFacts,
} from "@/lib/useWillAiCanonicalFacts";
import { Textarea } from "@/components/ui/textarea";
import { ArchivedConversationsTab } from "@/components/admin/WillAiArchiveTab";
import { useMyRoles } from "@/core/roles/useMyRoles";


const ADMIN_WILL_AI_TABS = ["sources", "gaps", "facts", "conversations"] as const;
type AdminWillAiTab = (typeof ADMIN_WILL_AI_TABS)[number];

type AdminWillAiSearch = {
  tab?: AdminWillAiTab;
  owner?: string;
  conversation?: string;
  message?: string;
};

function parseTab(v: unknown): AdminWillAiTab | undefined {
  return typeof v === "string" && (ADMIN_WILL_AI_TABS as readonly string[]).includes(v)
    ? (v as AdminWillAiTab)
    : undefined;
}
function parseStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 && v.length < 200 ? v : undefined;
}

export const Route = createFileRoute("/_authenticated/app/admin/will-ai")({
  // All params optional; unknown/malformed values fall back to defaults so
  // a bad deep-link lands on the Sources tab, never in an error boundary.
  validateSearch: (raw: Record<string, unknown>): AdminWillAiSearch => {
    const out: AdminWillAiSearch = {};
    const tab = parseTab(raw.tab);
    if (tab) out.tab = tab;
    const owner = parseStr(raw.owner);
    if (owner) out.owner = owner;
    const conversation = parseStr(raw.conversation);
    if (conversation) out.conversation = conversation;
    const message = parseStr(raw.message);
    if (message) out.message = message;
    return out;
  },
  component: WillAiAdmin,
});

function WillAiAdmin() {
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading: rolesLoading } = useMyRoles(user.id);

  if (rolesLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }
  if (!roles?.includes("admin")) {
    return (
      <div className="max-w-md mx-auto px-8 py-16 text-center flex flex-col gap-3">
        <h1 className="text-2xl">Not authorised</h1>
        <p className="text-ink-muted text-sm">
          You don't have access to the admin area.
        </p>
      </div>
    );
  }

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
          <TabsTrigger value="facts">Facts</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="mt-0">
          <SourcesTab />
        </TabsContent>
        <TabsContent value="gaps" className="mt-0">
          <ContentGapsTab />
        </TabsContent>
        <TabsContent value="facts" className="mt-0">
          <CanonicalFactsTab />
        </TabsContent>
        <TabsContent value="conversations" className="mt-0">
          <ArchivedConversationsTab />
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
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Import from SOPs</h2>
              <SopsImportCard />
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Upload a PDF</h2>
              <UploadForm />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Import from YouTube</h2>
              <YouTubeImportCard />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-xl">Import from SOPs</h2>
              <SopsImportCard />
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
      const [
        { data: fbLive, error: fbErr },
        { data: fbArch, error: fbArchErr },
      ] = await Promise.all([
        supabase
          .from("will_ai_messages")
          .select("id, conversation_id, owner_id, created_at")
          .eq("role", "assistant")
          .eq("used_fallback", true)
          .or("used_fact_keys.is.null,used_fact_keys.eq.{}")
          .order("created_at", { ascending: false })
          .limit(CONTENT_GAPS_LIMIT),
        supabase
          .from("will_ai_messages_archive")
          .select("id, conversation_id, owner_id, created_at")
          .eq("role", "assistant")
          .eq("used_fallback", true)
          .or("used_fact_keys.is.null,used_fact_keys.eq.{}")
          .order("created_at", { ascending: false })
          .limit(CONTENT_GAPS_LIMIT),
      ]);
      if (fbErr) throw fbErr;
      if (fbArchErr) throw fbArchErr;

      const byId = new Map<
        string,
        { id: string; conversation_id: string; owner_id: string; created_at: string }
      >();
      for (const r of [...(fbLive ?? []), ...(fbArch ?? [])] as any[]) {
        if (!byId.has(r.id)) byId.set(r.id, r);
      }
      const rows = Array.from(byId.values())
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, CONTENT_GAPS_LIMIT);
      if (rows.length === 0) return [];

      const conversationIds = Array.from(
        new Set(rows.map((r) => r.conversation_id)),
      );
      const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)));

      const [
        { data: usersLive, error: uErr },
        { data: usersArch, error: uArchErr },
        { data: profiles },
      ] = await Promise.all([
        supabase
          .from("will_ai_messages")
          .select("id, conversation_id, content, created_at")
          .eq("role", "user")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("will_ai_messages_archive")
          .select("id, conversation_id, content, created_at")
          .eq("role", "user")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, email")
          .in("id", ownerIds),
      ]);
      if (uErr) throw uErr;
      if (uArchErr) throw uArchErr;

      const seenUser = new Set<string>();
      const mergedUsers: Array<{
        conversation_id: string;
        content: string;
        created_at: string;
      }> = [];
      for (const u of [...(usersLive ?? []), ...(usersArch ?? [])] as any[]) {
        if (seenUser.has(u.id)) continue;
        seenUser.add(u.id);
        mergedUsers.push({
          conversation_id: u.conversation_id,
          content: u.content,
          created_at: u.created_at,
        });
      }
      mergedUsers.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

      const userMsgsByConv = new Map<
        string,
        Array<{ content: string; created_at: string }>
      >();
      for (const u of mergedUsers) {
        const list = userMsgsByConv.get(u.conversation_id) ?? [];
        list.push({ content: u.content, created_at: u.created_at });
        userMsgsByConv.set(u.conversation_id, list);
      }
      const emailById = new Map<string, string>();
      for (const p of (profiles ?? []) as any[]) emailById.set(p.id, p.email);

      return rows.map((r) => {
        const priors = userMsgsByConv.get(r.conversation_id) ?? [];
        // The triggering question is the last user message with created_at
        // at or before the fallback's created_at (tied timestamps within
        // a single persist_will_ai_turn transaction are the same turn).
        let question: string | null = null;
        for (const u of priors) {
          if (u.created_at <= r.created_at) question = u.content;
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

// -------------------- SOPs import --------------------

/**
 * Import an existing SOP PDF from the SOPs library into Will AI without
 * re-uploading the file. Copy-on-import: `importSopToWillAi` service-role
 * copies `sops/{path}` → `will-ai-content/{sourceId}/source.pdf`, so the
 * existing ingestion worker + citation-resolution paths keep working
 * unchanged.
 *
 * Dedupe via `will_ai_sources.sop_id` (unique). Re-import overwrites the
 * copied PDF, wipes chunks + rendered pages, resets the row, re-enqueues.
 */
function SopsImportCard() {
  const q = useSopsWillAiStatus();
  const importMut = useImportSopToWillAi();
  const [pendingSopId, setPendingSopId] = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<
    | { kind: "ok"; reimport: boolean; title: string }
    | { kind: "err"; title: string; error: string }
    | null
  >(null);

  const rows = q.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: SopWillAiRow[] }>();
    for (const r of rows) {
      const key = r.folder_id ?? "__unassigned__";
      const name = r.folder_name ?? "Unassigned";
      const bucket = map.get(key) ?? { name, items: [] };
      bucket.items.push(r);
      map.set(key, bucket);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [rows]);

  function onImport(row: SopWillAiRow) {
    setLastMsg(null);
    setPendingSopId(row.sop_id);
    importMut.mutate(row.sop_id, {
      onSuccess: (res) => {
        setLastMsg({
          kind: "ok",
          reimport: res.wasReimport,
          title: row.sop_title,
        });
      },
      onError: (e) => {
        setLastMsg({
          kind: "err",
          title: row.sop_title,
          error: e instanceof Error ? e.message : "Import failed",
        });
      },
      onSettled: () => setPendingSopId(null),
    });
  }

  if (q.isLoading) {
    return <p className="text-ink-muted text-sm">Loading SOPs…</p>;
  }
  if (q.error) {
    return (
      <p className="text-sm text-[var(--red)]">
        {(q.error as Error).message}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-ink-muted text-sm">
        No SOPs in the library yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted text-xs">
        PDF SOPs from the shared library. DOCX SOPs can't be ingested.
      </p>

      <div className="border border-border rounded-xl divide-y divide-border max-h-[26rem] overflow-y-auto">
        {grouped.map((g) => (
          <div key={g.name} className="flex flex-col">
            <div className="px-3 py-1.5 bg-[var(--surface-raised)] text-ink-muted text-[10px] uppercase tracking-wide">
              {g.name}
            </div>
            <ul className="divide-y divide-border">
              {g.items.map((r) => {
                const isPending =
                  pendingSopId === r.sop_id && importMut.isPending;
                const isProcessing =
                  r.status === "pending" || r.status === "processing";
                const isCompleted = r.status === "completed";
                const isFailed = r.status === "failed";
                const grayed = !r.is_pdf;

                return (
                  <li
                    key={r.sop_id}
                    className={`flex items-center gap-3 px-3 py-2 ${grayed ? "opacity-50" : ""}`}
                  >
                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-ink text-sm truncate">
                          {r.sop_title}
                        </span>
                        {r.status && (
                          <StatusBadge status={r.status} />
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide border bg-[var(--surface-raised)] text-ink-muted border-border">
                            <Check className="w-3 h-3" />
                            imported
                          </span>
                        )}
                      </div>
                      <span className="text-ink-muted text-xs truncate">
                        {r.file_name}
                        {!r.is_pdf ? " · PDF only" : ""}
                      </span>
                      {isFailed && r.error_message && (
                        <span className="text-[var(--red)] text-xs truncate">
                          {r.error_message}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0">
                      {!r.is_pdf ? null : isProcessing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {r.status}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => onImport(r)}
                        >
                          {isPending
                            ? "Queuing…"
                            : isFailed
                              ? "Retry"
                              : isCompleted
                                ? "Re-import"
                                : "Import"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {lastMsg?.kind === "ok" && (
        <p className="text-sm text-ink-muted">
          {lastMsg.reimport ? "Re-import queued" : "Import queued"} ·{" "}
          {lastMsg.title}
        </p>
      )}
      {lastMsg?.kind === "err" && (
        <p className="text-sm text-[var(--red)]">
          {lastMsg.title} — {lastMsg.error}
        </p>
      )}
    </div>
  );
}


// -------------------- canonical facts --------------------

/**
 * Admin CRUD for authoritative facts injected into every Will AI chat.
 * Facts override retrieved passages and the model's general knowledge for
 * the topics they cover.
 */
function CanonicalFactsTab() {
  const q = useWillAiCanonicalFacts();
  const createMut = useCreateWillAiCanonicalFact();
  const updateMut = useUpdateWillAiCanonicalFact();
  const deleteMut = useDeleteWillAiCanonicalFact();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WillAiCanonicalFact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WillAiCanonicalFact | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const rows = q.data ?? [];

  function truncate(s: string, n = 160) {
    return s.length > n ? `${s.slice(0, n)}…` : s;
  }

  async function onSubmitCreate(input: {
    fact_key: string;
    label: string;
    fact_text: string;
    sort_order: number;
  }) {
    setFormError(null);
    try {
      await createMut.mutateAsync(input);
      setCreateOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function onSubmitEdit(input: {
    fact_key: string;
    label: string;
    fact_text: string;
    sort_order: number;
  }) {
    if (!editTarget) return;
    setFormError(null);
    try {
      await updateMut.mutateAsync({ id: editTarget.id, patch: input });
      setEditTarget(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl">Canonical facts</h2>
          <p className="text-ink-muted text-xs max-w-prose">
            Authoritative statements injected into every Will AI chat. Facts
            override retrieved passages and the model's general knowledge on
            the topics they cover.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          New fact
        </Button>
      </div>

      {q.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}
      {q.error && (
        <p className="text-sm text-[var(--red)]">
          {(q.error as Error).message}
        </p>
      )}

      {!q.isLoading && rows.length === 0 && (
        <p className="text-ink-muted text-sm">No facts yet.</p>
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
          {rows.map((f) => (
            <li
              key={f.id}
              className="flex items-start justify-between gap-4 px-5 py-4"
            >
              <div className="flex flex-col min-w-0 gap-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ink text-sm font-medium">
                    {f.label}
                  </span>
                  <code className="text-[10px] text-ink-muted bg-[var(--surface-raised)] rounded px-1.5 py-0.5">
                    {f.fact_key}
                  </code>
                  {!f.is_active && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide border bg-[var(--surface-raised)] text-ink-muted border-border">
                      inactive
                    </span>
                  )}
                </div>
                <p className="text-ink-muted text-xs whitespace-pre-wrap break-words">
                  {truncate(f.fact_text)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={f.is_active}
                    disabled={updateMut.isPending}
                    onCheckedChange={(v) =>
                      updateMut.mutate({ id: f.id, patch: { is_active: v } })
                    }
                    aria-label={`Toggle ${f.label} active`}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormError(null);
                    setEditTarget(f);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[var(--red)] hover:text-[var(--red)]"
                  onClick={() => setDeleteTarget(f)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CanonicalFactDialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) setFormError(null);
          setCreateOpen(o);
        }}
        title="New fact"
        submitLabel={createMut.isPending ? "Creating…" : "Create"}
        submitting={createMut.isPending}
        error={formError}
        initial={null}
        onSubmit={onSubmitCreate}
      />

      <CanonicalFactDialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setFormError(null);
            setEditTarget(null);
          }
        }}
        title="Edit fact"
        submitLabel={updateMut.isPending ? "Saving…" : "Save"}
        submitting={updateMut.isPending}
        error={formError}
        initial={editTarget}
        onSubmit={onSubmitEdit}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete "{deleteTarget?.label}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the fact. Will AI will no longer inject
              it into chat responses.
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
              {deleteMut.isPending ? "Deleting…" : "Delete fact"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function CanonicalFactDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  initial: WillAiCanonicalFact | null;
  onSubmit: (input: {
    fact_key: string;
    label: string;
    fact_text: string;
    sort_order: number;
  }) => void;
}) {
  const { open, onOpenChange, title, submitLabel, submitting, error, initial } =
    props;
  const [factKey, setFactKey] = useState("");
  const [label, setLabel] = useState("");
  const [factText, setFactText] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  useMemo(() => {
    if (open) {
      setFactKey(initial?.fact_key ?? "");
      setLabel(initial?.label ?? "");
      setFactText(initial?.fact_text ?? "");
      setSortOrder(String(initial?.sort_order ?? 0));
    }
  }, [open, initial]);

  const canSubmit =
    !submitting &&
    factKey.trim().length > 0 &&
    label.trim().length > 0 &&
    factText.trim().length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Facts are injected verbatim into the Will AI system prompt.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            const parsed = Number.parseInt(sortOrder, 10);
            props.onSubmit({
              fact_key: factKey.trim(),
              label: label.trim(),
              fact_text: factText.trim(),
              sort_order: Number.isFinite(parsed) ? parsed : 0,
            });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="fact-key">Key</Label>
            <Input
              id="fact-key"
              value={factKey}
              onChange={(e) => setFactKey(e.target.value)}
              placeholder="skool-community"
              disabled={submitting}
            />
            <p className="text-ink-muted text-xs">
              Stable slug. Must be unique.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fact-label">Label</Label>
            <Input
              id="fact-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Skool community"
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fact-text">Fact</Label>
            <Textarea
              id="fact-text"
              value={factText}
              onChange={(e) => setFactText(e.target.value)}
              rows={5}
              disabled={submitting}
              placeholder="The authoritative statement, injected verbatim."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fact-sort">Sort order</Label>
            <Input
              id="fact-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={submitting}
            />
          </div>
          {error && <p className="text-sm text-[var(--red)]">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

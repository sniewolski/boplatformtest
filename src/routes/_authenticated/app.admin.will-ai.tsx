import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
    <div className="app-content py-16 flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Will AI content</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Upload the books, transcripts, and other sources Will draws from.
          Ingestion runs in the background — status updates automatically.
        </p>
      </header>

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
                            className="text-xs text-[var(--amber,#b45309)] w-fit underline-offset-2 hover:underline"
                          >
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
  const styles: Record<WillAiSource["status"], string> = {
    pending:
      "bg-[var(--surface-raised)] text-ink-muted border border-border",
    processing:
      "bg-blue-500/10 text-blue-600 border border-blue-500/30 animate-pulse",
    completed:
      "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30",
    failed:
      "bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/40 font-medium",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

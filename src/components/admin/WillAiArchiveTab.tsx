/**
 * Admin-only, read-only view of the permanent Will AI conversation archive.
 * Same visual language as the owner-facing Chat.tsx (markdown + citation
 * pills), but no composer, no delete, no reply — display only.
 */
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FileText, ImageIcon, Play, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PdfPreview } from "@/components/PdfPreview";
import {
  type WillAiChunkRef,
  getWillAiSignedUrl,
  useResolvedChunks,
} from "@/lib/useWillAi";
import {
  type ArchivedMessage,
  getArchivedConversationThread,
  listArchivedConversationsForOwner,
  listArchivedOwnersSummary,
} from "@/lib/willAiArchive.functions";

type View =
  | { kind: "owners" }
  | {
      kind: "conversations";
      ownerId: string;
      ownerName: string | null;
      ownerEmail: string | null;
    }
  | {
      kind: "thread";
      ownerId: string;
      ownerName: string | null;
      ownerEmail: string | null;
      conversationId: string;
      conversationTitle: string | null;
    };

export function ArchivedConversationsTab() {
  const [view, setView] = useState<View>({ kind: "owners" });

  return (
    <div className="flex flex-col gap-4">
      {view.kind === "owners" && (
        <OwnersList
          onOpen={(o) =>
            setView({
              kind: "conversations",
              ownerId: o.ownerId,
              ownerName: o.ownerName,
              ownerEmail: o.ownerEmail,
            })
          }
        />
      )}
      {view.kind === "conversations" && (
        <ConversationsList
          ownerId={view.ownerId}
          ownerName={view.ownerName}
          ownerEmail={view.ownerEmail}
          onBack={() => setView({ kind: "owners" })}
          onOpen={(c) =>
            setView({
              kind: "thread",
              ownerId: view.ownerId,
              ownerName: view.ownerName,
              ownerEmail: view.ownerEmail,
              conversationId: c.id,
              conversationTitle: c.title,
            })
          }
        />
      )}
      {view.kind === "thread" && (
        <ThreadView
          ownerName={view.ownerName}
          ownerEmail={view.ownerEmail}
          conversationId={view.conversationId}
          conversationTitle={view.conversationTitle}
          onBack={() =>
            setView({
              kind: "conversations",
              ownerId: view.ownerId,
              ownerName: view.ownerName,
              ownerEmail: view.ownerEmail,
            })
          }
        />
      )}
    </div>
  );
}

// -------------------- owners --------------------

function OwnersList({
  onOpen,
}: {
  onOpen: (o: {
    ownerId: string;
    ownerName: string | null;
    ownerEmail: string | null;
  }) => void;
}) {
  const listOwners = useServerFn(listArchivedOwnersSummary);
  const q = useQuery({
    queryKey: ["will-ai-archive", "owners"],
    queryFn: () => listOwners({}),
  });

  if (q.isLoading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }
  if (q.error) {
    return (
      <p className="text-sm text-[var(--red)]">
        {(q.error as Error).message}
      </p>
    );
  }
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No archived conversations yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((o) => (
        <li key={o.ownerId}>
          <button
            type="button"
            onClick={() =>
              onOpen({
                ownerId: o.ownerId,
                ownerName: o.ownerName,
                ownerEmail: o.ownerEmail,
              })
            }
            className="w-full text-left flex items-center justify-between gap-4 rounded-xl border border-border bg-[var(--surface-raised)] px-4 py-3 hover:border-[var(--red)] transition-colors"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm text-ink truncate">
                {o.ownerName || o.ownerEmail || o.ownerId}
              </span>
              {o.ownerEmail && o.ownerName && (
                <span className="text-xs text-ink-muted truncate">
                  {o.ownerEmail}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-sm text-ink">
                {o.conversationCount}{" "}
                {o.conversationCount === 1 ? "chat" : "chats"}
              </span>
              <span className="text-xs text-ink-muted">
                Last {new Date(o.lastActivityAt).toLocaleDateString()}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

// -------------------- conversations --------------------

function ConversationsList({
  ownerId,
  ownerName,
  ownerEmail,
  onBack,
  onOpen,
}: {
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  onBack: () => void;
  onOpen: (c: { id: string; title: string | null }) => void;
}) {
  const listConvs = useServerFn(listArchivedConversationsForOwner);
  const q = useQuery({
    queryKey: ["will-ai-archive", "conversations", ownerId],
    queryFn: () => listConvs({ data: { ownerId } }),
  });

  return (
    <div className="flex flex-col gap-4">
      <BackHeader
        onBack={onBack}
        title={ownerName || ownerEmail || ownerId}
        subtitle={ownerName && ownerEmail ? ownerEmail : null}
      />
      {q.isLoading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : q.error ? (
        <p className="text-sm text-[var(--red)]">
          {(q.error as Error).message}
        </p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted">No archived conversations.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(q.data ?? []).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen({ id: c.id, title: c.title })}
                className="w-full text-left flex items-center justify-between gap-4 rounded-xl border border-border bg-[var(--surface-raised)] px-4 py-3 hover:border-[var(--red)] transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-ink truncate">
                    {c.title || "New chat"}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {c.messageCount}{" "}
                    {c.messageCount === 1 ? "message" : "messages"}
                  </span>
                </div>
                <span className="text-xs text-ink-muted shrink-0">
                  Archived {new Date(c.archivedAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -------------------- thread --------------------

function ThreadView({
  ownerName,
  ownerEmail,
  conversationId,
  conversationTitle,
  onBack,
}: {
  ownerName: string | null;
  ownerEmail: string | null;
  conversationId: string;
  conversationTitle: string | null;
  onBack: () => void;
}) {
  const getThread = useServerFn(getArchivedConversationThread);
  const q = useQuery({
    queryKey: ["will-ai-archive", "thread", conversationId],
    queryFn: () => getThread({ data: { conversationId } }),
  });

  const [pdfPreview, setPdfPreview] = useState<
    | { sourceTitle: string; storagePath: string; page: number; url?: string | null }
    | null
  >(null);
  useEffect(() => {
    if (!pdfPreview || pdfPreview.url !== undefined) return;
    let cancelled = false;
    (async () => {
      const url = await getWillAiSignedUrl(pdfPreview.storagePath, 600);
      if (!cancelled) setPdfPreview((p) => (p ? { ...p, url } : p));
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfPreview]);

  const openPdfAt = (sourceTitle: string, storagePath: string, page: number) =>
    setPdfPreview({ sourceTitle, storagePath, page });

  const subtitle = useMemo(
    () =>
      [ownerName, ownerEmail].filter(Boolean).join(" · ") || null,
    [ownerName, ownerEmail],
  );

  return (
    <div className="flex flex-col gap-4">
      <BackHeader
        onBack={onBack}
        title={conversationTitle || "Conversation"}
        subtitle={subtitle}
      />
      {q.isLoading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : q.error ? (
        <p className="text-sm text-[var(--red)]">
          {(q.error as Error).message}
        </p>
      ) : (
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-[var(--surface-raised)] p-6">
          {(q.data ?? []).map((m) => (
            <MessageRow key={m.id} message={m} onOpenPdf={openPdfAt} />
          ))}
          {(q.data ?? []).length === 0 && (
            <p className="text-sm text-ink-muted">No messages in this conversation.</p>
          )}
        </div>
      )}

      <Dialog
        open={!!pdfPreview}
        onOpenChange={(open) => {
          if (!open) setPdfPreview(null);
        }}
      >
        <DialogContent className="max-w-4xl w-[92vw] max-h-[92vh] overflow-hidden flex flex-col gap-3">
          {pdfPreview && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-ink truncate">
                    {pdfPreview.sourceTitle}
                  </span>
                  <span className="text-xs text-ink-muted">
                    Opening at page {pdfPreview.page}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <PdfPreview
                  fileUrl={pdfPreview.url ?? null}
                  initialPage={pdfPreview.page}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BackHeader({
  onBack,
  title,
  subtitle,
}: {
  onBack: () => void;
  title: string;
  subtitle: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-ink hover:border-[var(--red)] hover:text-[var(--red)] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-ink truncate">{title}</span>
        {subtitle && (
          <span className="text-xs text-ink-muted truncate">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

// -------------------- message + citations (mirrors Chat.tsx, read-only) --------------------

function MessageRow({
  message,
  onOpenPdf,
}: {
  message: ArchivedMessage;
  onOpenPdf: (sourceTitle: string, storagePath: string, page: number) => void;
}) {
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-[var(--red)] text-white px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] flex flex-col gap-3">
        <div className="text-ink text-sm leading-relaxed break-words [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic [&_code]:rounded [&_code]:bg-[var(--surface-raised)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
        {message.cited_chunk_ids.length > 0 && (
          <Citations
            chunkIds={message.cited_chunk_ids}
            onOpenPdf={onOpenPdf}
          />
        )}
      </div>
    </div>
  );
}

function Citations({
  chunkIds,
  onOpenPdf,
}: {
  chunkIds: string[];
  onOpenPdf: (sourceTitle: string, storagePath: string, page: number) => void;
}) {
  const refs = useResolvedChunks(chunkIds);
  const list = refs.data ?? [];
  const diagrams = list.filter((c) => c.chunk_type === "diagram");
  const transcripts = list.filter((c) => c.chunk_type === "transcript");
  const texts = list.filter(
    (c) => c.chunk_type !== "diagram" && c.chunk_type !== "transcript",
  );

  return (
    <div className="flex flex-col gap-3">
      {diagrams.map((c) => (
        <DiagramCitation key={c.id} chunk={c} onOpenPdf={onOpenPdf} />
      ))}
      {(texts.length > 0 || transcripts.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {texts.map((c) => (
            <CitationLink key={c.id} chunk={c} onOpenPdf={onOpenPdf} />
          ))}
          {transcripts.map((c) => (
            <TranscriptCitationLink key={c.id} chunk={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function citationLabel(c: WillAiChunkRef): string {
  if (c.chunk_type === "transcript" && c.start_seconds != null) {
    return `${c.source_title} · ${formatTimestamp(c.start_seconds)}`;
  }
  if (c.page_number != null) return `${c.source_title}, p.${c.page_number}`;
  return c.source_title;
}

function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function CitationLink({
  chunk,
  onOpenPdf,
}: {
  chunk: WillAiChunkRef;
  onOpenPdf: (sourceTitle: string, storagePath: string, page: number) => void;
}) {
  const disabled = !chunk.source_storage_path || chunk.page_number == null;
  const pageLabel = chunk.page_number != null ? `p.${chunk.page_number}` : null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        !disabled &&
        onOpenPdf(
          chunk.source_title,
          chunk.source_storage_path!,
          chunk.page_number!,
        )
      }
      title={citationLabel(chunk)}
      className="inline-flex items-center gap-1.5 max-w-full rounded-[12px] border border-border bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-ink hover:border-[var(--red)] hover:text-[var(--red)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:text-ink transition-[color,border-color]"
    >
      <FileText className="size-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate max-w-[220px]">{chunk.source_title}</span>
      {pageLabel && (
        <span className="shrink-0 rounded-md bg-[var(--surface)] border border-border px-1.5 py-0.5 text-[10px] leading-none text-ink-muted font-medium">
          {pageLabel}
        </span>
      )}
    </button>
  );
}

function TranscriptCitationLink({ chunk }: { chunk: WillAiChunkRef }) {
  const disabled = !chunk.external_id;
  const start = chunk.start_seconds ?? 0;
  const href = chunk.external_id
    ? `https://youtu.be/${chunk.external_id}?t=${Math.max(0, Math.floor(start))}`
    : undefined;
  const tsLabel = chunk.start_seconds != null ? formatTimestamp(chunk.start_seconds) : null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      title={citationLabel(chunk)}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
      className="inline-flex items-center gap-1.5 max-w-full rounded-[12px] border border-border bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-ink hover:border-[var(--red)] hover:text-[var(--red)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:border-border aria-disabled:hover:text-ink transition-[color,border-color]"
    >
      <Play className="size-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate max-w-[220px]">{chunk.source_title}</span>
      {tsLabel && (
        <span className="shrink-0 rounded-md bg-[var(--surface)] border border-border px-1.5 py-0.5 text-[10px] leading-none text-ink-muted font-medium tabular-nums">
          {tsLabel}
        </span>
      )}
    </a>
  );
}

function DiagramCitation({
  chunk,
  onOpenPdf,
}: {
  chunk: WillAiChunkRef;
  onOpenPdf: (sourceTitle: string, storagePath: string, page: number) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!chunk.image_storage_path) return;
    (async () => {
      const u = await getWillAiSignedUrl(chunk.image_storage_path!, 600);
      if (cancelled) return;
      if (!u) setFailed(true);
      else setUrl(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [chunk.image_storage_path]);

  return (
    <div className="flex flex-col gap-1">
      {url && !failed ? (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="rounded-lg overflow-hidden border border-border bg-[var(--surface-raised)] max-w-md"
          aria-label="Expand diagram"
        >
          <img
            src={url}
            alt={`Diagram from ${chunk.source_title}${chunk.page_number != null ? `, p.${chunk.page_number}` : ""}`}
            className="w-full h-auto block"
            onError={() => setFailed(true)}
          />
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-[var(--surface-raised)] px-3 py-3 flex items-center gap-2 text-xs text-ink-muted max-w-md">
          <ImageIcon className="size-4" />
          <span>Diagram unavailable</span>
        </div>
      )}
      <CitationLink chunk={chunk} onOpenPdf={onOpenPdf} />

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-5xl w-[92vw] max-h-[92vh] overflow-hidden p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">
              {citationLabel(chunk)}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="text-ink-muted hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center">
            {url && (
              <img
                src={url}
                alt=""
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

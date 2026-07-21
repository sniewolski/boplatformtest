/**
 * Admin-only, read-only view of the permanent Will AI conversation archive.
 * Same visual language as the owner-facing Chat.tsx (markdown + citation
 * pills), but no composer, no delete, no reply — display only.
 *
 * Drill state (which owner / conversation is open, and which message to
 * scroll to) is driven entirely by URL search params passed in from the
 * parent route: `owner`, `conversation`, `message`. This makes archive
 * views addressable and lets Content Gaps rows deep-link directly into
 * the message they came from.
 */
import { useEffect, useMemo, useRef, useState } from "react";
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
  type ArchivedConversationMeta,
  getArchivedConversationById,
  getArchivedConversationThread,
  listArchivedConversationsForOwner,
  listArchivedOwnersSummary,
} from "@/lib/willAiArchive.functions";

export type ArchiveNavPatch = {
  owner?: string | undefined;
  conversation?: string | undefined;
  message?: string | undefined;
};

type ArchiveProps = {
  owner: string | null;
  conversation: string | null;
  message: string | null;
  onNavigate: (patch: ArchiveNavPatch) => void;
};

/**
 * A row an owners/conversations click can carry along so we don't have to
 * refetch metadata we just displayed. Direct URL entry has no such context.
 */
type HeaderHint = {
  ownerName?: string | null;
  ownerEmail?: string | null;
  conversationTitle?: string | null;
};

export function ArchivedConversationsTab({
  owner,
  conversation,
  message,
  onNavigate,
}: ArchiveProps) {
  // Metadata for the currently-open row — populated by clicks (fast path),
  // or hydrated from the server on direct URL entry (fallback path).
  const [hint, setHint] = useState<HeaderHint>({});

  // Reset the hint whenever the URL points at a different conversation.
  useEffect(() => {
    setHint({});
  }, [conversation]);

  return (
    <div className="flex flex-col gap-4">
      {!owner && !conversation && (
        <OwnersList
          onOpen={(o) => {
            setHint({ ownerName: o.ownerName, ownerEmail: o.ownerEmail });
            onNavigate({ owner: o.ownerId });
          }}
        />
      )}
      {owner && !conversation && (
        <ConversationsList
          ownerId={owner}
          ownerName={hint.ownerName ?? null}
          ownerEmail={hint.ownerEmail ?? null}
          onBack={() => onNavigate({ owner: undefined, message: undefined })}
          onOpen={(c) => {
            setHint((prev) => ({ ...prev, conversationTitle: c.title }));
            onNavigate({ conversation: c.id });
          }}
        />
      )}
      {conversation && (
        <ThreadView
          conversationId={conversation}
          highlightMessageId={message}
          hint={hint}
          onBack={() =>
            onNavigate({ conversation: undefined, message: undefined })
          }
          onHydrated={(meta) =>
            setHint({
              ownerName: meta.ownerName,
              ownerEmail: meta.ownerEmail,
              conversationTitle: meta.title,
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
  conversationId,
  highlightMessageId,
  hint,
  onBack,
  onHydrated,
}: {
  conversationId: string;
  highlightMessageId: string | null;
  hint: HeaderHint;
  onBack: () => void;
  onHydrated: (meta: ArchivedConversationMeta) => void;
}) {
  const getThread = useServerFn(getArchivedConversationThread);
  const getMeta = useServerFn(getArchivedConversationById);

  const threadQ = useQuery({
    queryKey: ["will-ai-archive", "thread", conversationId],
    queryFn: () => getThread({ data: { conversationId } }),
  });

  // Only hit the metadata endpoint when the parent hasn't already handed us
  // owner/title from a click. On direct URL entry `hint` is empty.
  const needsMeta =
    !hint.ownerName && !hint.ownerEmail && !hint.conversationTitle;
  const metaQ = useQuery({
    queryKey: ["will-ai-archive", "conversation-meta", conversationId],
    queryFn: () => getMeta({ data: { conversationId } }),
    enabled: needsMeta,
  });

  // Feed hydrated metadata back up to the parent so the header stops
  // saying "Conversation" and back-nav shows the right owner name.
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!metaQ.data) return;
    if (hydratedRef.current === conversationId) return;
    hydratedRef.current = conversationId;
    onHydrated(metaQ.data);
  }, [metaQ.data, conversationId, onHydrated]);

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

  // Direct URL entry: metadata not yet hydrated → generic placeholders.
  const displayTitle =
    hint.conversationTitle ?? metaQ.data?.title ?? "Conversation";
  const displayOwnerName = hint.ownerName ?? metaQ.data?.ownerName ?? null;
  const displayOwnerEmail = hint.ownerEmail ?? metaQ.data?.ownerEmail ?? null;
  const subtitle = useMemo(
    () =>
      [displayOwnerName, displayOwnerEmail].filter(Boolean).join(" · ") || null,
    [displayOwnerName, displayOwnerEmail],
  );

  // Scroll to and briefly ring the requested message, once the thread has
  // rendered. Honour prefers-reduced-motion: skip smooth scrolling, keep
  // the highlight. Silently no-op if the id isn't in the thread.
  const [highlightNode, setHighlightNode] = useState<string | null>(null);
  useEffect(() => {
    if (!highlightMessageId) return;
    if (!threadQ.data) return;
    const el = document.getElementById(`msg-${highlightMessageId}`);
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
    setHighlightNode(highlightMessageId);
    const t = window.setTimeout(() => setHighlightNode(null), 2000);
    return () => window.clearTimeout(t);
  }, [highlightMessageId, threadQ.data]);

  const notFound = needsMeta && !metaQ.isLoading && metaQ.data === null;

  return (
    <div className="flex flex-col gap-4">
      <BackHeader onBack={onBack} title={displayTitle} subtitle={subtitle} />
      {notFound ? (
        <div className="rounded-xl border border-border bg-[var(--surface-raised)] p-6">
          <p className="text-sm text-ink">Conversation not found.</p>
          <p className="text-xs text-ink-muted mt-1">
            This conversation is not in the archive. It may never have been
            created, or the id in the link is wrong.
          </p>
        </div>
      ) : threadQ.isLoading || (needsMeta && metaQ.isLoading) ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : threadQ.error ? (
        <p className="text-sm text-[var(--red)]">
          {(threadQ.error as Error).message}
        </p>
      ) : (
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-[var(--surface-raised)] p-6">
          {(threadQ.data ?? []).map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              highlighted={highlightNode === m.id}
              onOpenPdf={openPdfAt}
            />
          ))}
          {(threadQ.data ?? []).length === 0 && (
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
  highlighted,
  onOpenPdf,
}: {
  message: ArchivedMessage;
  highlighted: boolean;
  onOpenPdf: (sourceTitle: string, storagePath: string, page: number) => void;
}) {
  const isUser = message.role === "user";
  // Ring in --red, cleared after ~2s. Rounded to match message bubbles.
  const highlightCls = highlighted
    ? "ring-2 ring-[var(--red)] ring-offset-2 ring-offset-[var(--surface-raised)] rounded-2xl transition-shadow"
    : "transition-shadow";
  if (isUser) {
    return (
      <div id={`msg-${message.id}`} className={`flex justify-end ${highlightCls}`}>
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-[var(--red)] text-white px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div id={`msg-${message.id}`} className={`flex justify-start ${highlightCls}`}>
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

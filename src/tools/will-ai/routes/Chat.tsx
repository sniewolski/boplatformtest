import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  FileText,
  ImageIcon,
  MessageSquarePlus,
  RotateCw,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSession } from "@/core/auth/useSession";
import {
  type WillAiChunkRef,
  type WillAiMessage,
  getWillAiSignedUrl,
  useResolvedChunks,
  useSendWillAiMessage,
  useWillAiConversations,
  useWillAiMessages,
} from "@/lib/useWillAi";
import { PdfPreview } from "@/components/PdfPreview";

export function WillAiChat() {
  const { session } = useSession();
  const ownerId = session?.user?.id ?? null;

  const conversations = useWillAiConversations(ownerId);

  // Active conversation id. null = "new chat" (server creates on first send).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // On first load, open the most recent conversation if any exists.
  useEffect(() => {
    if (initialized) return;
    if (!conversations.data) return;
    if (conversations.data.length > 0) {
      setActiveId(conversations.data[0].id);
    }
    setInitialized(true);
  }, [conversations.data, initialized]);

  const messages = useWillAiMessages(activeId);
  const send = useSendWillAiMessage(ownerId);

  const [draft, setDraft] = useState("");
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  // Optimistic user bubble shown immediately on submit, before the RPC
  // resolves. Uses a temp client-side id so it can't collide with the
  // real persisted id that comes back from the server.
  const [pendingUser, setPendingUser] = useState<WillAiMessage | null>(null);

  // For preview of a source PDF at a specific page (from a citation click).
  const [pdfPreview, setPdfPreview] = useState<
    | { sourceTitle: string; storagePath: string; page: number; url?: string | null }
    | null
  >(null);
  useEffect(() => {
    if (!pdfPreview || pdfPreview.url !== undefined) return;
    let cancelled = false;
    (async () => {
      const url = await getWillAiSignedUrl(pdfPreview.storagePath, 600);
      if (!cancelled) setPdfPreview((prev) => (prev ? { ...prev, url } : prev));
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfPreview]);

  const openPdfAt = (sourceTitle: string, storagePath: string, page: number) => {
    setPdfPreview({ sourceTitle, storagePath, page });
  };

  const rows = messages.data ?? [];

  // Scroll to bottom on new messages / when sending.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length, send.isPending, pendingUser]);

  const canSend = draft.trim().length > 0 && !send.isPending && !!ownerId;

  const doSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !ownerId) return;
    setLastFailedInput(null);
    // Clear the composer + render the optimistic user bubble immediately.
    setDraft("");
    setPendingUser({
      id: `optimistic-${Date.now()}`,
      conversation_id: activeId ?? "pending",
      owner_id: ownerId,
      role: "user",
      content: trimmed,
      cited_chunk_ids: [],
      created_at: new Date().toISOString(),
      used_fallback: false,
    } as unknown as WillAiMessage);
    send.mutate(
      { conversationId: activeId, userMessage: trimmed },
      {
        onSuccess: (res) => {
          if (!activeId) setActiveId(res.conversationId);
          setPendingUser(null);
        },
        onError: () => {
          setLastFailedInput(trimmed);
        },
      },
    );
  };

  const handleSubmit = () => {
    if (!canSend) return;
    doSend(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };


  const startNewChat = () => {
    setActiveId(null);
    setDraft("");
    setLastFailedInput(null);
    setPendingUser(null);
  };

  const isEmpty =
    !messages.isLoading &&
    rows.length === 0 &&
    !send.isPending &&
    !pendingUser;


  return (
    <div className="app-content py-10 flex flex-col gap-6 min-h-[calc(100vh-8rem)]">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl">Will AI</h1>
          <p className="text-ink-muted text-sm">
            Digital version of Will and his 10+ years of experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conversations.data && conversations.data.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Past chats
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Your conversations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {conversations.data.slice(0, 20).map((c) => {
                  const title =
                    (c.title && c.title.length > 60
                      ? c.title.slice(0, 57) + "…"
                      : c.title) || "New chat";
                  const date = new Date(c.created_at).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" },
                  );
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      onSelect={() => setActiveId(c.id)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="text-sm truncate w-full">{title}</span>
                      <span className="text-xs text-ink-muted">{date}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={startNewChat}
            className="active:scale-[0.97] transition-transform"
          >
            <MessageSquarePlus className="size-4" />
            New chat
          </Button>
        </div>
      </header>

      {/* Message thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1"
      >
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-16">
            <p className="text-ink text-lg">Ask Will anything.</p>
            <p className="text-ink-muted text-sm max-w-md">
              Answers come straight from the material — books, notes, and
              recorded sessions.
            </p>
          </div>
        )}

        {rows.map((m) => (
          <MessageRow key={m.id} message={m} onOpenPdf={openPdfAt} />
        ))}

        {pendingUser && (
          <MessageRow
            key={pendingUser.id}
            message={pendingUser}
            onOpenPdf={openPdfAt}
          />
        )}

        {send.isPending && <ThinkingIndicator />}



        {send.isError && lastFailedInput && (
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--red)]/40 bg-[var(--surface-raised)] p-3 text-sm">
            <div className="flex items-start gap-2 text-[var(--red)]">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span>Couldn't send that message.</span>
                <span className="text-ink-muted text-xs">
                  {(send.error as Error)?.message ?? "Unknown error"}
                </span>
              </div>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => doSend(lastFailedInput)}
                className="active:scale-[0.97] transition-transform"
              >
                <RotateCw className="size-4" />
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-[var(--surface-raised)] p-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none min-h-[38px] max-h-[200px]"
            style={{ height: "auto" }}
          />
          <Button
            size="sm"
            disabled={!canSend}
            onClick={handleSubmit}
            className="active:scale-[0.97] transition-transform"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-xs text-ink-muted px-1">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>

      {/* PDF preview modal for text/page citations */}
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

// -------------------- message row --------------------

function MessageRow({
  message,
  onOpenPdf,
}: {
  message: WillAiMessage;
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

// -------------------- citations --------------------

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
  const texts = list.filter((c) => c.chunk_type !== "diagram");

  return (
    <div className="flex flex-col gap-3">
      {diagrams.map((c) => (
        <DiagramCitation key={c.id} chunk={c} onOpenPdf={onOpenPdf} />
      ))}
      {texts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {texts.map((c) => (
            <CitationLink key={c.id} chunk={c} onOpenPdf={onOpenPdf} />
          ))}
        </div>
      )}
    </div>
  );
}

function citationLabel(c: WillAiChunkRef): string {
  if (c.page_number != null) return `${c.source_title}, p.${c.page_number}`;
  return c.source_title;
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
      className="inline-flex items-center gap-1.5 max-w-full rounded-[12px] border border-border bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-ink hover:border-[var(--red)] hover:text-[var(--red)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:text-ink active:scale-[0.97] transition-[transform,color,border-color]"
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
          className="rounded-lg overflow-hidden border border-border bg-[var(--surface-raised)] max-w-md active:scale-[0.99] transition-transform"
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

// -------------------- thinking indicator --------------------

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-1.5 text-ink-muted text-sm"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Thinking</span>
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 rounded-full bg-ink-muted motion-safe:animate-pulse"
      style={{ animationDelay: delay }}
    />
  );
}

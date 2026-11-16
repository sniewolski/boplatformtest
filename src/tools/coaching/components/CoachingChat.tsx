import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  coachingKeys,
  insertCoachingMessage,
  useCoachingMessages,
  useCoachingSenderNames,
  type CoachingMessage,
} from "../data/coaching";
import { useCoachingStaffNames } from "../data/coachingAdmin";
import { coachingInboxKey } from "@/lib/useCoachingInbox";
import { formatMessageTime } from "../lib/format";

export type CoachingViewer = "owner" | "admin";

type PendingMessage = {
  tempId: string;
  body: string;
  created_at: string;
  status: "sending" | "failed";
};

export function CoachingChat({
  ownerId,
  viewerId,
  viewer,
  ownerName,
  visible,
}: {
  /** The thread being shown. */
  ownerId: string | null;
  /** The signed-in user (equals ownerId on the owner page). */
  viewerId: string | null;
  viewer: CoachingViewer;
  /** Admin view: label for the owner's (left-side) messages. */
  ownerName?: string;
  /** False while hidden behind the phone "Tasks" tab; used to re-scroll on show. */
  visible: boolean;
}) {
  const queryClient = useQueryClient();
  const messages = useCoachingMessages(ownerId);
  const rows = messages.data ?? [];
  const isAdminView = viewer === "admin";
  // Owner page: names come from the owner-scoped RPC. Admin page: admins
  // can read profiles, so look up every staff sender plus the viewer.
  const ownerNames = useCoachingSenderNames(ownerId, !isAdminView);
  const staffIds = isAdminView
    ? [...rows.filter((m) => m.sender_id !== ownerId).map((m) => m.sender_id), ...(viewerId ? [viewerId] : [])]
    : [];
  const staffNames = useCoachingStaffNames(staffIds, isAdminView);
  const names = (isAdminView ? staffNames.data : ownerNames.data) ?? {};
  /** Right-aligned "my side": the owner on the owner page, staff on the admin page. */
  const isMySide = (senderId: string) =>
    isAdminView ? senderId !== ownerId : senderId === ownerId;

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingMessage[]>([]);

  // Auto-scroll to the newest message on load, on send, on a failed send and when re-shown.
  const pendingStatusKey = pending.map((p) => p.status).join(",");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length, pending.length, pendingStatusKey, visible]);

  // Grow the composer with its content, up to the CSS max height.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const deliver = async (item: PendingMessage) => {
    if (!ownerId || !viewerId) return;
    setPending((list) =>
      list.map((p) => (p.tempId === item.tempId ? { ...p, status: "sending" } : p)),
    );
    try {
      const saved = await insertCoachingMessage(ownerId, viewerId, item.body);
      queryClient.setQueryData<CoachingMessage[]>(
        coachingKeys.messages(ownerId),
        (list) => (list?.some((m) => m.id === saved.id) ? list : [...(list ?? []), saved]),
      );
      setPending((list) => list.filter((p) => p.tempId !== item.tempId));
      queryClient.invalidateQueries({ queryKey: coachingKeys.messages(ownerId) });
      if (isAdminView) queryClient.invalidateQueries({ queryKey: coachingInboxKey });
    } catch {
      setPending((list) =>
        list.map((p) => (p.tempId === item.tempId ? { ...p, status: "failed" } : p)),
      );
    }
  };

  const canSend = draft.trim().length > 0 && !!ownerId && !!viewerId;

  const handleSubmit = () => {
    const body = draft.trim();
    if (!body || !ownerId || !viewerId) return;
    const item: PendingMessage = {
      tempId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      body,
      created_at: new Date().toISOString(),
      status: "sending",
    };
    setDraft("");
    setPending((list) => [...list, item]);
    void deliver(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.isSuccess && rows.length === 0 && pending.length === 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6"
        aria-live="polite"
      >
        <div className="flex flex-col gap-5 min-h-full">
          {messages.isLoading && <p className="text-ink-muted text-sm">Loading messages…</p>}

          {messages.isError && (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="text-ink-muted">Couldn't load your messages.</p>
              <Button variant="outline" size="sm" onClick={() => messages.refetch()}>
                <RotateCw className="size-4" />
                Try again
              </Button>
            </div>
          )}

          {isEmpty && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-16">
              {isAdminView ? (
                <>
                  <p className="text-ink text-lg">No messages yet.</p>
                  <p className="text-ink-muted text-sm">Start the conversation below.</p>
                </>
              ) : (
                <>
                  <p className="text-ink text-lg">Say hello to the team.</p>
                  <p className="text-ink-muted text-sm">
                    Ask a question, share a win or tell us where you're stuck.
                  </p>
                </>
              )}
            </div>
          )}

          {rows.map((m) => (
            <MessageBubble
              key={m.id}
              body={m.body}
              createdAt={m.created_at}
              mine={isMySide(m.sender_id)}
              senderName={
                isAdminView && m.sender_id === ownerId
                  ? (ownerName ?? "Owner")
                  : (names[m.sender_id] ?? null)
              }
              showMyName={isAdminView}
            />
          ))}

          {pending.map((p) => (
            <div key={p.tempId} className="flex flex-col items-end gap-1.5">
              <MessageBubble
                body={p.body}
                createdAt={p.created_at}
                mine
                senderName={viewerId ? (names[viewerId] ?? null) : null}
                showMyName={isAdminView}
                status={p.status}
              />
              {p.status === "failed" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-[var(--red)]">
                    <AlertTriangle className="size-3.5" aria-hidden />
                    Not sent
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void deliver(p)}
                    className="h-7 px-2 text-xs active:scale-[0.97] transition-transform"
                  >
                    <RotateCw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pb-6 pt-2 flex flex-col gap-2">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-[var(--surface-raised)] p-2 focus-within:border-[var(--border-strong)]">
          <label htmlFor="coaching-composer" className="sr-only">
            {isAdminView ? "Message this owner" : "Message the team"}
          </label>
          <textarea
            id="coaching-composer"
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAdminView ? "Reply…" : "Message the team…"}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none min-h-[38px] max-h-[200px]"
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
        <p className="text-xs text-ink-muted px-1">Enter to send · Shift+Enter for a new line</p>
      </div>
    </div>
  );
}

function MessageBubble({
  body,
  createdAt,
  mine,
  senderName,
  showMyName = false,
  status,
}: {
  body: string;
  createdAt: string;
  mine: boolean;
  senderName: string | null;
  /** Admin view: staff bubbles (right side) also carry the sender's name. */
  showMyName?: boolean;
  status?: "sending" | "failed";
}) {
  const time = formatMessageTime(createdAt);
  if (mine) {
    return (
      <div className="flex flex-col items-end gap-1 w-full">
        {showMyName && (
          <span className="text-xs font-medium text-ink">{senderName?.trim() || "Admin"}</span>
        )}
        <div
          className={`max-w-[80%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap break-words${
            status ? " opacity-70" : ""
          }`}
        >
          {body}
        </div>
        <span className="text-[11px] text-ink-muted tabular-nums">
          {status === "sending" ? "Sending…" : time}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1 w-full">
      <span className="text-xs font-medium text-ink">{senderName?.trim() || "The team"}</span>
      <div className="max-w-[80%] rounded-2xl rounded-tl-md border border-border bg-[var(--surface-raised)] text-ink px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
        {body}
      </div>
      <span className="text-[11px] text-ink-muted tabular-nums">{time}</span>
    </div>
  );
}

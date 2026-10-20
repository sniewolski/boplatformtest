/**
 * The ONLY module that talks to `sosa_answers`.
 *
 * - useSosaAnswers(): loads every row for the owner into one query cache entry.
 * - useSosaAnswer(questionId): read + setters. Every change writes the cache
 *   immediately, then schedules a debounced per-question save.
 * - Save manager (module scope): 700 ms debounce per question, at most one
 *   request in flight per question (latest state queued), one automatic retry
 *   after 3 s, then an error state. flushAllSosaSaves() sends everything now.
 * - useSosaSaveStatus(): shared "idle" | "saving" | "saved" | "error" + retryAll.
 */
import { useCallback, useSyncExternalStore } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import type { SosaAnswer, SosaFieldValue, SosaMarker } from "../types";

const DEBOUNCE_MS = 700;
const RETRY_MS = 3000;

export type SosaAnswersMap = Record<string, SosaAnswer>;

export const sosaAnswersKey = (ownerId: string | undefined) => ["sosa-answers", ownerId] as const;

export function emptySosaAnswer(questionId: string): SosaAnswer {
  return { questionId, value: {}, estimates: {}, marker: null, updatedAt: "" };
}

// ───────── Load ─────────

// The active query client + owner, registered by useSosaAnswers so the non-hook
// updateSosaAnswer() can reach the same cache and save manager.
let activeQc: QueryClient | null = null;
let activeOwnerId: string | null = null;

export function useSosaAnswers() {
  const { session } = useSession();
  const ownerId = session?.user.id;
  const qc = useQueryClient();
  activeQc = qc;
  activeOwnerId = ownerId ?? null;
  const query = useQuery({
    queryKey: sosaAnswersKey(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<SosaAnswersMap> => {
      const { data, error } = await supabase
        .from("sosa_answers")
        .select("question_id, value, estimates, marker, updated_at")
        .eq("owner_id", ownerId!);
      if (error) throw error;
      const map: SosaAnswersMap = {};
      for (const r of data ?? []) {
        map[r.question_id] = {
          questionId: r.question_id,
          value: (r.value ?? {}) as Record<string, SosaFieldValue>,
          estimates: (r.estimates ?? {}) as Record<string, true>,
          marker: (r.marker as SosaMarker | null) ?? null,
          updatedAt: r.updated_at,
        };
      }
      return map;
    },
    // Never refetch behind the user's back — it would clobber typing.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return { ...query, ownerId, answers: query.data };
}

// ───────── Save manager ─────────

type Entry = {
  ownerId: string;
  timer: ReturnType<typeof setTimeout> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  pending: SosaAnswer | null;
  retried: boolean;
  error: boolean;
};

export type SosaSaveStatus = "idle" | "saving" | "saved" | "error";

const entries = new Map<string, Entry>();
let everSaved = false;
let status: SosaSaveStatus = "idle";
const listeners = new Set<() => void>();

function recomputeStatus() {
  let next: SosaSaveStatus = everSaved ? "saved" : "idle";
  let saving = false;
  let error = false;
  for (const e of entries.values()) {
    if (e.error) error = true;
    else if (e.inFlight || e.pending || e.timer || e.retryTimer) saving = true;
  }
  if (saving) next = "saving";
  if (error) next = "error";
  if (next !== status) {
    status = next;
    listeners.forEach((l) => l());
  }
}

function entryFor(questionId: string, ownerId: string): Entry {
  let e = entries.get(questionId);
  if (!e || e.ownerId !== ownerId) {
    e = { ownerId, timer: null, retryTimer: null, inFlight: false, pending: null, retried: false, error: false };
    entries.set(questionId, e);
  }
  return e;
}

function schedule(ownerId: string, answer: SosaAnswer) {
  const e = entryFor(answer.questionId, ownerId);
  e.pending = answer;
  if (e.timer) clearTimeout(e.timer);
  e.timer = setTimeout(() => {
    e.timer = null;
    void send(answer.questionId);
  }, DEBOUNCE_MS);
  recomputeStatus();
}

async function send(questionId: string) {
  const e = entries.get(questionId);
  if (!e) return;
  if (e.timer) {
    clearTimeout(e.timer);
    e.timer = null;
  }
  if (e.retryTimer) {
    clearTimeout(e.retryTimer);
    e.retryTimer = null;
  }
  // One request per question: the running save picks up `pending` when done.
  if (e.inFlight || !e.pending) {
    recomputeStatus();
    return;
  }
  const payload = e.pending;
  e.pending = null;
  e.inFlight = true;
  recomputeStatus();

  const { error } = await supabase.from("sosa_answers").upsert(
    {
      owner_id: e.ownerId,
      question_id: payload.questionId,
      value: payload.value as never,
      estimates: payload.estimates as never,
      marker: payload.marker,
    },
    { onConflict: "owner_id,question_id" },
  );
  e.inFlight = false;

  if (error) {
    // Keep the change pending (unless a newer one already replaced it).
    if (!e.pending) e.pending = payload;
    if (!e.retried) {
      e.retried = true;
      e.retryTimer = setTimeout(() => {
        e.retryTimer = null;
        void send(questionId);
      }, RETRY_MS);
    } else {
      e.error = true;
    }
    recomputeStatus();
    return;
  }

  e.retried = false;
  e.error = false;
  everSaved = true;
  // A newer change arrived mid-flight: send it now (unless its debounce is still running).
  if (e.pending && !e.timer) void send(questionId);
  recomputeStatus();
}

/** Send every pending save immediately (tab hidden, tool unmount). */
export function flushAllSosaSaves() {
  for (const [qid, e] of entries) {
    if (e.pending && !e.error) void send(qid);
  }
}

export function retryAllSosaSaves() {
  for (const [qid, e] of entries) {
    if (e.error) {
      e.error = false;
      e.retried = false;
      void send(qid);
    }
  }
  recomputeStatus();
}

export function useSosaSaveStatus() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => "idle" as SosaSaveStatus,
  );
  return { status: s, retryAll: retryAllSosaSaves };
}

// ───────── Per-question hook ─────────

/**
 * The single write path: update the cached answer, then schedule its debounced save.
 * Non-hook so list deletions can cascade into OTHER questions' answers.
 */
export function updateSosaAnswer(questionId: string, updater: (prev: SosaAnswer) => SosaAnswer) {
  const qc = activeQc;
  const ownerId = activeOwnerId;
  if (!qc || !ownerId) return;
  const key = sosaAnswersKey(ownerId);
  const map = qc.getQueryData<SosaAnswersMap>(key) ?? {};
  const next = { ...updater(map[questionId] ?? emptySosaAnswer(questionId)), updatedAt: new Date().toISOString() };
  qc.setQueryData<SosaAnswersMap>(key, { ...map, [questionId]: next });
  schedule(ownerId, next);
}

export type SosaAnswerApi = {
  answer: SosaAnswer;
  setFieldValue: (fieldKey: string, value: SosaFieldValue | undefined) => void;
  setEstimate: (path: string, on: boolean) => void;
  setMarker: (marker: SosaMarker | null) => void;
};

export function useSosaAnswer(questionId: string): SosaAnswerApi {
  const { answers, ownerId } = useSosaAnswers();
  const answer = answers?.[questionId] ?? emptySosaAnswer(questionId);

  const setFieldValue = useCallback(
    (fieldKey: string, value: SosaFieldValue | undefined) => {
      if (!ownerId) return;
      updateSosaAnswer(questionId, (prev) => {
        const v = { ...prev.value };
        if (value === undefined) delete v[fieldKey];
        else v[fieldKey] = value;
        return { ...prev, value: v };
      });
    },
    [ownerId, questionId],
  );

  const setEstimate = useCallback(
    (path: string, on: boolean) => {
      if (!ownerId) return;
      updateSosaAnswer(questionId, (prev) => {
        const est = { ...prev.estimates };
        if (on) est[path] = true;
        else delete est[path];
        return { ...prev, estimates: est };
      });
    },
    [ownerId, questionId],
  );

  const setMarker = useCallback(
    (marker: SosaMarker | null) => {
      if (!ownerId) return;
      updateSosaAnswer(questionId, (prev) => ({ ...prev, marker }));
    },
    [ownerId, questionId],
  );

  return { answer, setFieldValue, setEstimate, setMarker };
}

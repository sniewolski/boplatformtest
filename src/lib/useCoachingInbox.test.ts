import { describe, expect, it } from "vitest";
import {
  countAwaitingReply,
  formatWaiting,
  splitCoachingInbox,
  type CoachingInboxRow,
} from "./useCoachingInbox";

function row(p: Partial<CoachingInboxRow> & { owner_id: string }): CoachingInboxRow {
  return {
    full_name: p.owner_id,
    email: `${p.owner_id}@x.com`,
    last_message_body: null,
    last_message_at: null,
    awaiting_reply: false,
    awaiting_since: null,
    tasks_done: 0,
    tasks_total: 0,
    ...p,
  };
}

const rows = [
  row({ owner_id: "new-wait", awaiting_reply: true, awaiting_since: "2026-11-16T10:00:00Z", last_message_at: "2026-11-16T10:00:00Z" }),
  row({ owner_id: "old-wait", awaiting_reply: true, awaiting_since: "2026-11-14T10:00:00Z", last_message_at: "2026-11-16T11:00:00Z" }),
  row({ owner_id: "silent" }),
  row({ owner_id: "recent", last_message_at: "2026-11-16T12:00:00Z" }),
  row({ owner_id: "older", last_message_at: "2026-11-10T12:00:00Z" }),
];

describe("coaching inbox", () => {
  it("lists awaiting threads oldest awaiting_since first", () => {
    expect(splitCoachingInbox(rows).awaiting.map((r) => r.owner_id)).toEqual(["old-wait", "new-wait"]);
  });

  it("lists everyone else most recent first, owners with no messages last", () => {
    expect(splitCoachingInbox(rows).others.map((r) => r.owner_id)).toEqual(["recent", "older", "silent"]);
  });

  it("badge counts only threads awaiting a reply", () => {
    expect(countAwaitingReply(rows)).toBe(2);
    expect(countAwaitingReply([])).toBe(0);
  });

  it("formats waiting time", () => {
    const now = new Date("2026-11-16T12:00:00Z");
    expect(formatWaiting("2026-11-16T11:48:00Z", now)).toBe("12 min");
    expect(formatWaiting("2026-11-16T09:00:00Z", now)).toBe("3 h");
    expect(formatWaiting("2026-11-14T12:00:00Z", now)).toBe("2 days");
  });
});

describe("inbox safety-net poll", () => {
  it("refetches every 2 minutes", async () => {
    const { COACHING_INBOX_POLL_MS } = await import("./useCoachingInbox");
    expect(COACHING_INBOX_POLL_MS).toBe(120_000);
  });
});

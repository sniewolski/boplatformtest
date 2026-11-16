import { describe, expect, it } from "vitest";
import { mergeCoachingMessage, type CoachingMessage } from "./coaching";

const msg = (id: string, created_at: string): CoachingMessage => ({
  id,
  owner_id: "o",
  sender_id: "o",
  body: id,
  created_at,
});

describe("mergeCoachingMessage", () => {
  it("does not add a message that is already in the thread", () => {
    const list = [msg("a", "2026-01-01T10:00:00Z")];
    expect(mergeCoachingMessage(list, msg("a", "2026-01-01T10:00:00Z"))).toHaveLength(1);
  });

  it("keeps the thread oldest first", () => {
    const list = [msg("b", "2026-01-01T10:05:00Z")];
    const merged = mergeCoachingMessage(list, msg("a", "2026-01-01T10:00:00Z"));
    expect(merged.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

import { describe, expect, it } from "vitest";
import { coachingReplyPreview, staffFirstName, COACHING_CHAT_URL } from "./coachingReply";
import { TEMPLATES } from "@/lib/email-templates/registry";

describe("coaching reply email", () => {
  it("keeps short messages whole, as plain single-line text", () => {
    expect(coachingReplyPreview("Hi there,\n\n  see you  Friday")).toBe("Hi there, see you Friday");
  });

  it("cuts long messages to about 200 characters", () => {
    const long = "word ".repeat(100);
    const preview = coachingReplyPreview(long);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(201);
    expect(preview.length).toBeGreaterThan(150);
  });

  it("uses the admin's first name", () => {
    expect(staffFirstName("Will Smith")).toBe("Will");
    expect(staffFirstName("  ")).toBeNull();
  });

  it("has the requested subject and links to the live chat", () => {
    expect(TEMPLATES["coaching-reply"].subject).toBe("New message from the Sales Lab team");
    expect(COACHING_CHAT_URL).toBe("https://lab.salesman.com/app/tools/coaching");
  });
});

import { describe, expect, it } from "vitest";
import { banDurationFor } from "./admin.functions";

describe("suspension ban", () => {
  it("suspending bans sign-in indefinitely", () => {
    expect(banDurationFor("suspended")).toBe("876000h");
  });
  it("reinstating lifts the ban", () => {
    expect(banDurationFor("active")).toBe("none");
  });
});

import { describe, expect, it } from "vitest";
import { PAUSED_MESSAGE, isBannedError } from "./authErrors";

describe("banned sign-in message", () => {
  it("uses the agreed wording", () => {
    expect(PAUSED_MESSAGE).toBe("Your access is currently paused. Please get in touch with the team.");
  });
  it("recognises a banned sign-in error", () => {
    expect(isBannedError({ code: "user_banned", message: "User is banned" })).toBe(true);
  });
  it("leaves other sign-in errors alone", () => {
    expect(isBannedError({ code: "otp_expired", message: "Token has expired or is invalid" })).toBe(false);
  });
});

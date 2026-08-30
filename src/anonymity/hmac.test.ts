import { describe, expect, it } from "vitest";
import { hmacUserId } from "./hmac.js";

describe("hmacUserId", () => {
  it("returns a 64-char hex digest", () => {
    const hash = hmacUserId("secret", "U123");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable for the same inputs", () => {
    expect(hmacUserId("secret", "U123")).toBe(hmacUserId("secret", "U123"));
  });

  it("changes when the user id changes", () => {
    expect(hmacUserId("secret", "U123")).not.toBe(hmacUserId("secret", "U456"));
  });

  it("cannot be reversed to the original id by equality with the raw id", () => {
    const hash = hmacUserId("secret", "U123");
    expect(hash).not.toContain("U123");
  });
});

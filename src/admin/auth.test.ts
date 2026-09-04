import { describe, expect, it } from "vitest";
import { bearerMatches } from "./auth.js";

describe("bearerMatches", () => {
  it("accepts the matching bearer token", () => {
    expect(bearerMatches("Bearer secret-token", "secret-token")).toBe(true);
  });

  it("rejects a missing, malformed, or wrong token", () => {
    expect(bearerMatches(undefined, "secret-token")).toBe(false);
    expect(bearerMatches("secret-token", "secret-token")).toBe(false);
    expect(bearerMatches("Bearer other", "secret-token")).toBe(false);
    expect(bearerMatches("Bearer secret-token-extra", "secret-token")).toBe(false);
  });
});

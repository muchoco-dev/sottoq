import { describe, expect, it } from "vitest";
import { hmacUserId } from "../anonymity/hmac.js";
import { isEligibleMember, pickRandom, selectRecipients } from "./select.js";

describe("isEligibleMember", () => {
  it("excludes bots, deleted users, guests, slackbot, and the app bot", () => {
    expect(isEligibleMember({ id: "U1" }, "B0TB0T")).toBe(true);
    expect(isEligibleMember({ id: "USLACKBOT" }, "B0TB0T")).toBe(false);
    expect(isEligibleMember({ id: "B0TB0T" }, "B0TB0T")).toBe(false);
    expect(isEligibleMember({ id: "U2", deleted: true }, "B0TB0T")).toBe(false);
    expect(isEligibleMember({ id: "U3", is_bot: true }, "B0TB0T")).toBe(false);
    expect(isEligibleMember({ id: "U4", is_restricted: true }, "B0TB0T")).toBe(false);
    expect(
      isEligibleMember({ id: "U5", is_ultra_restricted: true }, "B0TB0T"),
    ).toBe(false);
  });
});

describe("pickRandom", () => {
  it("returns up to the requested count", () => {
    expect(pickRandom(["a", "b", "c"], 2, () => 0)).toHaveLength(2);
    expect(pickRandom(["a"], 5, () => 0)).toEqual(["a"]);
  });
});

describe("selectRecipients", () => {
  const secret = "hmac-secret";

  it("skips users who already received the question", () => {
    const existing = hmacUserId(secret, "U1");
    const selected = selectRecipients({
      members: [{ id: "U1" }, { id: "U2" }, { id: "U3" }],
      existingHashes: [existing],
      hmacSecret: secret,
      count: 5,
      botUserId: "B0TB0T",
      random: () => 0,
    });
    expect(selected.map((row) => row.userId).sort()).toEqual(["U2", "U3"]);
    expect(selected.every((row) => row.hash !== existing)).toBe(true);
  });
});

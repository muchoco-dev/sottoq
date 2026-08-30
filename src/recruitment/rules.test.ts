import { describe, expect, it } from "vitest";
import {
  isRecruiting,
  shouldCloseRecruitment,
} from "./rules.js";

const now = new Date("2026-08-10T00:00:00+09:00");

describe("shouldCloseRecruitment", () => {
  it("does not close when already closed", () => {
    expect(
      shouldCloseRecruitment(
        {
          closedAt: now,
          createdAt: new Date("2026-08-01T00:00:00+09:00"),
          answers: [],
        },
        now,
      ),
    ).toBe(false);
  });

  it("closes when there are 5 non-rejected answers", () => {
    expect(
      shouldCloseRecruitment(
        {
          closedAt: null,
          createdAt: now,
          answers: [
            { status: "pending" },
            { status: "approved" },
            { status: "approved" },
            { status: "pending" },
            { status: "approved" },
          ],
        },
        now,
      ),
    ).toBe(true);
  });

  it("ignores rejected answers toward the cap", () => {
    expect(
      shouldCloseRecruitment(
        {
          closedAt: null,
          createdAt: now,
          answers: [
            { status: "rejected" },
            { status: "approved" },
            { status: "pending" },
          ],
        },
        now,
      ),
    ).toBe(false);
  });

  it("closes after 7 days from createdAt", () => {
    expect(
      shouldCloseRecruitment(
        {
          closedAt: null,
          createdAt: new Date("2026-08-03T00:00:00+09:00"),
          answers: [],
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("isRecruiting", () => {
  it("requires approved, open, within 7 days, and fewer than 5 answers", () => {
    expect(
      isRecruiting(
        {
          status: "approved",
          closedAt: null,
          createdAt: now,
          answers: [{ status: "pending" }],
        },
        now,
      ),
    ).toBe(true);
  });

  it("rejects pending questions", () => {
    expect(
      isRecruiting(
        {
          status: "pending",
          closedAt: null,
          createdAt: now,
          answers: [],
        },
        now,
      ),
    ).toBe(false);
  });
});

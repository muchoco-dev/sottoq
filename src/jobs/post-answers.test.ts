import { describe, expect, it } from "vitest";
import { postApprovedAnswers } from "./post-answers.js";
import {
  createConfig,
  createLogger,
  createPrismaMock,
  createSlackMock,
} from "../test/mocks.js";

const now = new Date("2026-08-10T12:00:00+09:00");

describe("postApprovedAnswers", () => {
  it("posts oldest unposted approved answers, max 3, and formats Q/A", async () => {
    const db = createPrismaMock();
    const slack = createSlackMock();
    db.answer.findMany.mockResolvedValue([
      {
        id: 1,
        body: "水です",
        isAnonymous: true,
        answererSlackUserId: null,
        createdAt: new Date("2026-08-08T00:00:00+09:00"),
        question: { body: "好きな飲み物は？" },
      },
      {
        id: 2,
        body: "コーヒーです",
        isAnonymous: false,
        answererSlackUserId: "U123",
        createdAt: new Date("2026-08-09T00:00:00+09:00"),
        question: { body: "好きな飲み物は？" },
      },
    ]);
    db.answer.update.mockResolvedValue({});

    const posted = await postApprovedAnswers({
      db: db as never,
      slack,
      config: createConfig(),
      logger: createLogger(),
      now: () => now,
      postIntervalMs: 0,
    });

    expect(posted).toBe(2);
    expect(db.answer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "approved", postedAt: null },
        orderBy: { createdAt: "asc" },
        take: 3,
      }),
    );
    expect(slack.postMessage).toHaveBeenNthCalledWith(1, {
      channel: "C123",
      text: "Q. 好きな飲み物は？\n\nA.\n水です",
    });
    expect(slack.postMessage).toHaveBeenNthCalledWith(2, {
      channel: "C123",
      text: "Q. 好きな飲み物は？\n\nA. <@U123> さん\nコーヒーです",
    });
    expect(db.answer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { postedAt: now },
    });
  });

  it("does not post pending or already posted answers because of the query filter", async () => {
    const db = createPrismaMock();
    db.answer.findMany.mockResolvedValue([]);
    const slack = createSlackMock();

    const posted = await postApprovedAnswers({
      db: db as never,
      slack,
      config: createConfig(),
      logger: createLogger(),
      now: () => now,
      postIntervalMs: 0,
    });

    expect(posted).toBe(0);
    expect(slack.postMessage).not.toHaveBeenCalled();
  });
});

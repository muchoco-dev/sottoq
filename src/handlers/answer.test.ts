import { describe, expect, it } from "vitest";
import { saveAnswer } from "./answer.js";
import { createPrismaMock } from "../test/mocks.js";

describe("saveAnswer", () => {
  it("stores null user id for anonymous answers", async () => {
    const db = createPrismaMock();
    db.answer.create.mockResolvedValue({ id: 1 });

    await saveAnswer(db as never, {
      questionId: 10,
      body: "  匿名です  ",
      isAnonymous: true,
      slackUserId: "U999",
    });

    expect(db.answer.create).toHaveBeenCalledWith({
      data: {
        questionId: 10,
        body: "匿名です",
        isAnonymous: true,
        answererSlackUserId: null,
        status: "pending",
      },
    });
  });

  it("stores the slack user id for named answers", async () => {
    const db = createPrismaMock();
    db.answer.create.mockResolvedValue({ id: 2 });

    await saveAnswer(db as never, {
      questionId: 10,
      body: "記名です",
      isAnonymous: false,
      slackUserId: "U999",
    });

    expect(db.answer.create).toHaveBeenCalledWith({
      data: {
        questionId: 10,
        body: "記名です",
        isAnonymous: false,
        answererSlackUserId: "U999",
        status: "pending",
      },
    });
  });
});

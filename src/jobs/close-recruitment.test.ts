import { describe, expect, it } from "vitest";
import { closeRecruitmentForQuestion } from "./close-recruitment.js";
import { createPrismaMock } from "../test/mocks.js";

const now = new Date("2026-08-10T00:00:00+09:00");

describe("closeRecruitmentForQuestion", () => {
  it("stores aggregates and deletes recipient hashes", async () => {
    const db = createPrismaMock();
    db.question.findUnique.mockResolvedValue({
      id: 1,
      status: "approved",
      closedAt: null,
      createdAt: new Date("2026-08-01T00:00:00+09:00"),
      answers: [
        { status: "approved" },
        { status: "pending" },
        { status: "rejected" },
      ],
      recipients: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    db.question.update.mockResolvedValue({});
    db.questionRecipient.deleteMany.mockResolvedValue({ count: 3 });

    const closed = await closeRecruitmentForQuestion(db as never, 1, now);

    expect(closed).toBe(true);
    expect(db.question.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        recipientCount: 3,
        answerCount: 2,
        closedAt: now,
      },
    });
    expect(db.questionRecipient.deleteMany).toHaveBeenCalledWith({
      where: { questionId: 1 },
    });
  });

  it("does not overwrite aggregates when already closed", async () => {
    const db = createPrismaMock();
    db.question.findUnique.mockResolvedValue({
      id: 1,
      status: "approved",
      closedAt: now,
      createdAt: new Date("2026-08-01T00:00:00+09:00"),
      answers: [],
      recipients: [],
    });

    const closed = await closeRecruitmentForQuestion(db as never, 1, now);

    expect(closed).toBe(false);
    expect(db.question.update).not.toHaveBeenCalled();
    expect(db.questionRecipient.deleteMany).not.toHaveBeenCalled();
  });
});

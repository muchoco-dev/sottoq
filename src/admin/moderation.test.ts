import { describe, expect, it } from "vitest";
import { approveAnswer, approveQuestion, rejectAnswer, rejectQuestion } from "./moderation.js";
import { AdminHttpError } from "./errors.js";
import { createPrismaMock } from "../test/mocks.js";

const now = new Date("2026-08-10T09:00:00+09:00");

describe("moderation", () => {
  it("approves a pending question and sets moderatedAt", async () => {
    const db = createPrismaMock();
    db.question.updateMany.mockResolvedValue({ count: 1 });

    await approveQuestion(db as never, 1, now);

    expect(db.question.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: "pending" },
      data: { status: "approved", moderatedAt: now },
    });
  });

  it("rejects a pending question", async () => {
    const db = createPrismaMock();
    db.question.updateMany.mockResolvedValue({ count: 1 });

    await rejectQuestion(db as never, 2, now);

    expect(db.question.updateMany).toHaveBeenCalledWith({
      where: { id: 2, status: "pending" },
      data: { status: "rejected", moderatedAt: now },
    });
  });

  it("returns 404 when the question does not exist", async () => {
    const db = createPrismaMock();
    db.question.updateMany.mockResolvedValue({ count: 0 });
    db.question.findUnique.mockResolvedValue(null);

    await expect(approveQuestion(db as never, 99, now)).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<AdminHttpError>);
  });

  it("returns 409 when the question is not pending", async () => {
    const db = createPrismaMock();
    db.question.updateMany.mockResolvedValue({ count: 0 });
    db.question.findUnique.mockResolvedValue({ id: 1, status: "approved" });

    await expect(approveQuestion(db as never, 1, now)).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<AdminHttpError>);
  });

  it("approves and rejects pending answers", async () => {
    const db = createPrismaMock();
    db.answer.updateMany.mockResolvedValue({ count: 1 });

    await approveAnswer(db as never, 3);
    await rejectAnswer(db as never, 4);

    expect(db.answer.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 3, status: "pending" },
      data: { status: "approved" },
    });
    expect(db.answer.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 4, status: "pending" },
      data: { status: "rejected" },
    });
  });

  it("returns 409 when the answer is not pending", async () => {
    const db = createPrismaMock();
    db.answer.updateMany.mockResolvedValue({ count: 0 });
    db.answer.findUnique.mockResolvedValue({ id: 3, status: "approved" });

    await expect(rejectAnswer(db as never, 3)).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<AdminHttpError>);
  });
});

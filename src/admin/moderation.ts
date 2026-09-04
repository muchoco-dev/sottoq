import { AdminHttpError } from "./errors.js";
import type { Db } from "../types.js";

export async function approveQuestion(
  db: Db,
  id: number,
  now: Date,
): Promise<void> {
  await moderateQuestion(db, id, "approved", now);
}

export async function rejectQuestion(
  db: Db,
  id: number,
  now: Date,
): Promise<void> {
  await moderateQuestion(db, id, "rejected", now);
}

export async function approveAnswer(db: Db, id: number): Promise<void> {
  await moderateAnswer(db, id, "approved");
}

export async function rejectAnswer(db: Db, id: number): Promise<void> {
  await moderateAnswer(db, id, "rejected");
}

async function moderateQuestion(
  db: Db,
  id: number,
  status: "approved" | "rejected",
  now: Date,
): Promise<void> {
  const result = await db.question.updateMany({
    where: { id, status: "pending" },
    data: { status, moderatedAt: now },
  });
  if (result.count > 0) {
    return;
  }
  const existing = await db.question.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminHttpError(404, "question not found");
  }
  throw new AdminHttpError(409, "question is not pending");
}

async function moderateAnswer(
  db: Db,
  id: number,
  status: "approved" | "rejected",
): Promise<void> {
  const result = await db.answer.updateMany({
    where: { id, status: "pending" },
    data: { status },
  });
  if (result.count > 0) {
    return;
  }
  const existing = await db.answer.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminHttpError(404, "answer not found");
  }
  throw new AdminHttpError(409, "answer is not pending");
}

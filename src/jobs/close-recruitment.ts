import { countActiveAnswers, shouldCloseRecruitment } from "../recruitment/rules.js";
import type { Db } from "../types.js";

export async function closeRecruitmentForQuestion(
  db: Db,
  questionId: number,
  now: Date,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      include: { answers: true, recipients: true },
    });
    if (!question || question.status !== "approved") {
      return false;
    }
    if (!shouldCloseRecruitment(question, now)) {
      return false;
    }

    await tx.question.update({
      where: { id: questionId },
      data: {
        recipientCount: question.recipients.length,
        answerCount: countActiveAnswers(question.answers),
        closedAt: now,
      },
    });
    await tx.questionRecipient.deleteMany({
      where: { questionId },
    });
    return true;
  });
}

export async function closeExpiredRecruitments(
  db: Db,
  now: Date,
): Promise<number> {
  const questions = await db.question.findMany({
    where: {
      status: "approved",
      closedAt: null,
    },
    include: { answers: true, recipients: true },
  });

  let closed = 0;
  for (const question of questions) {
    if (!shouldCloseRecruitment(question, now)) {
      continue;
    }
    const didClose = await closeRecruitmentForQuestion(db, question.id, now);
    if (didClose) {
      closed += 1;
    }
  }
  return closed;
}

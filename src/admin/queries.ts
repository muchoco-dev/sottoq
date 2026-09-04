import type { ModerationStatus } from "@prisma/client";
import {
  countActiveAnswers,
  isRecruiting,
} from "../recruitment/rules.js";
import { AdminHttpError } from "./errors.js";
import type { Db } from "../types.js";

const STATUSES: ModerationStatus[] = ["pending", "approved", "rejected"];

export function parseStatus(value: string | null): ModerationStatus | undefined {
  if (value === null || value === "") {
    return undefined;
  }
  if ((STATUSES as string[]).includes(value)) {
    return value as ModerationStatus;
  }
  throw new AdminHttpError(400, "invalid status");
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function listQuestions(db: Db, status: ModerationStatus | undefined, now: Date) {
  const questions = await db.question.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      answers: { select: { status: true } },
      _count: { select: { recipients: true } },
    },
  });

  return questions.map((question) => ({
    id: question.id,
    body: question.body,
    status: question.status,
    createdAt: question.createdAt.toISOString(),
    moderatedAt: toIso(question.moderatedAt),
    closedAt: toIso(question.closedAt),
    recruiting: isRecruiting(question, now),
    recipientCount: question.closedAt
      ? (question.recipientCount ?? 0)
      : question._count.recipients,
    answerCount: question.closedAt
      ? (question.answerCount ?? 0)
      : countActiveAnswers(question.answers),
  }));
}

export async function listAnswers(db: Db, status: ModerationStatus | undefined) {
  const answers = await db.answer.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      question: { select: { id: true, body: true, status: true } },
    },
  });

  return answers.map((answer) => ({
    id: answer.id,
    questionId: answer.questionId,
    body: answer.body,
    isAnonymous: answer.isAnonymous,
    answererSlackUserId: answer.isAnonymous ? null : answer.answererSlackUserId,
    status: answer.status,
    postedAt: toIso(answer.postedAt),
    createdAt: answer.createdAt.toISOString(),
    question: {
      id: answer.question.id,
      body: answer.question.body,
      status: answer.question.status,
    },
  }));
}

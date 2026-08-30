import {
  MAX_ACTIVE_ANSWERS,
  RECRUITMENT_DAYS,
} from "../constants.js";

export function isWithinRecruitmentWindow(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() < RECRUITMENT_DAYS * 24 * 60 * 60 * 1000;
}

export function countActiveAnswers(
  answers: { status: string }[],
): number {
  return answers.filter((answer) => answer.status !== "rejected").length;
}

export function shouldCloseRecruitment(
  question: {
    closedAt: Date | null;
    createdAt: Date;
    answers: { status: string }[];
  },
  now: Date,
): boolean {
  if (question.closedAt) {
    return false;
  }
  if (countActiveAnswers(question.answers) >= MAX_ACTIVE_ANSWERS) {
    return true;
  }
  return !isWithinRecruitmentWindow(question.createdAt, now);
}

export function isRecruiting(
  question: {
    status: string;
    closedAt: Date | null;
    createdAt: Date;
    answers: { status: string }[];
  },
  now: Date,
): boolean {
  if (question.status !== "approved") {
    return false;
  }
  if (question.closedAt) {
    return false;
  }
  if (!isWithinRecruitmentWindow(question.createdAt, now)) {
    return false;
  }
  return countActiveAnswers(question.answers) < MAX_ACTIVE_ANSWERS;
}

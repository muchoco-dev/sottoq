import { POST_INTERVAL_MS, POSTS_PER_WINDOW } from "../constants.js";
import { AdminHttpError } from "../admin/errors.js";
import { formatChannelPost } from "../posting/format.js";
import type { Deps } from "../types.js";

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

type PostableAnswer = {
  id: number;
  body: string;
  isAnonymous: boolean;
  answererSlackUserId: string | null;
  question: { body: string };
};

export async function postApprovedAnswers(deps: Deps): Promise<number> {
  const sleep = deps.sleep ?? defaultSleep;
  const interval = deps.postIntervalMs ?? POST_INTERVAL_MS;
  const max = deps.maxPosts ?? POSTS_PER_WINDOW;

  const answers = await deps.db.answer.findMany({
    where: {
      status: "approved",
      postedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: max,
    include: { question: true },
  });

  let posted = 0;
  for (const [index, answer] of answers.entries()) {
    if (index > 0 && interval > 0) {
      await sleep(interval);
    }
    const didPost = await postAnswer(deps, answer);
    if (didPost) {
      posted += 1;
    }
  }
  return posted;
}

export async function postAnswerById(
  deps: Deps,
  answerId: number,
): Promise<{ posted: true }> {
  const answer = await deps.db.answer.findUnique({
    where: { id: answerId },
    include: { question: true },
  });
  if (!answer) {
    throw new AdminHttpError(404, "answer not found");
  }
  if (answer.status !== "approved" || answer.postedAt != null) {
    throw new AdminHttpError(409, "answer is not ready to post");
  }
  const didPost = await postAnswer(deps, answer);
  if (!didPost) {
    throw new AdminHttpError(409, "answer is not ready to post");
  }
  return { posted: true };
}

export async function postAnswer(
  deps: Deps,
  answer: PostableAnswer,
): Promise<boolean> {
  const now = (deps.now ?? (() => new Date()))();
  const claimed = await deps.db.answer.updateMany({
    where: { id: answer.id, status: "approved", postedAt: null },
    data: { postedAt: now },
  });
  if (claimed.count === 0) {
    return false;
  }

  const text = formatChannelPost({
    questionBody: answer.question.body,
    answerBody: answer.body,
    isAnonymous: answer.isAnonymous,
    answererSlackUserId: answer.answererSlackUserId,
  });

  try {
    await deps.slack.postMessage({
      channel: deps.config.slackChannelId,
      text,
    });
  } catch (error) {
    await deps.db.answer.update({
      where: { id: answer.id },
      data: { postedAt: null },
    });
    throw error;
  }
  return true;
}

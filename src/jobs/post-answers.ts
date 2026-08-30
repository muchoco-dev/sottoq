import { POST_INTERVAL_MS, POSTS_PER_WINDOW } from "../constants.js";
import { formatChannelPost } from "../posting/format.js";
import type { Deps } from "../types.js";

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function postApprovedAnswers(deps: Deps): Promise<number> {
  const now = (deps.now ?? (() => new Date()))();
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
    const text = formatChannelPost({
      questionBody: answer.question.body,
      answerBody: answer.body,
      isAnonymous: answer.isAnonymous,
      answererSlackUserId: answer.answererSlackUserId,
    });
    await deps.slack.postMessage({
      channel: deps.config.slackChannelId,
      text,
    });
    await deps.db.answer.update({
      where: { id: answer.id },
      data: { postedAt: now },
    });
    posted += 1;
  }
  return posted;
}

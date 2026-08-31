import {
  DM_INTERVAL_MS,
  RECIPIENTS_PER_ROUND,
} from "../constants.js";
import { isRecruiting } from "../recruitment/rules.js";
import { selectRecipients } from "../recruitment/select.js";
import { listChannelMembers } from "../slack/api.js";
import { buildQuestionDm } from "../slack/dm.js";
import { closeExpiredRecruitments } from "./close-recruitment.js";
import type { Deps } from "../types.js";

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function sendQuestions(deps: Deps): Promise<{
  sent: number;
  questions: number;
}> {
  const now = (deps.now ?? (() => new Date()))();
  const sleep = deps.sleep ?? defaultSleep;

  await closeExpiredRecruitments(deps.db, now);

  const questions = await deps.db.question.findMany({
    where: {
      status: "approved",
      closedAt: null,
    },
    include: {
      answers: { select: { status: true } },
      recipients: { select: { recipientHash: true } },
    },
  });

  const recruiting = questions.filter((question) => isRecruiting(question, now));
  if (recruiting.length === 0) {
    return { sent: 0, questions: 0 };
  }

  const members = await listChannelMembers(
    deps.slack,
    deps.config.slackChannelId,
  );
  const { botUserId } = await deps.slack.authTest();

  let sent = 0;
  for (const question of recruiting) {
    const selected = selectRecipients({
      members,
      existingHashes: question.recipients.map((row) => row.recipientHash),
      hmacSecret: deps.config.hmacSecret,
      count: RECIPIENTS_PER_ROUND,
      botUserId,
      random: deps.random,
    });

    for (const recipient of selected) {
      try {
        const { channelId } = await deps.slack.conversationsOpen(recipient.userId);
        const message = buildQuestionDm(question.id, question.body);
        await deps.slack.postMessage({
          channel: channelId,
          text: message.text,
          blocks: message.blocks,
        });
        await deps.db.questionRecipient.create({
          data: {
            questionId: question.id,
            recipientHash: recipient.hash,
          },
        });
        sent += 1;
      } catch {
        deps.logger.error("failed to send question dm");
      }
      const interval = deps.dmIntervalMs ?? DM_INTERVAL_MS;
      if (interval > 0) {
        await sleep(interval);
      }
    }
  }

  return { sent, questions: recruiting.length };
}

import {
  DM_INTERVAL_MS,
  RECIPIENTS_PER_ROUND,
} from "../constants.js";
import { AdminHttpError } from "../admin/errors.js";
import { isRecruiting } from "../recruitment/rules.js";
import { selectRecipients } from "../recruitment/select.js";
import { listChannelMembers } from "../slack/api.js";
import { buildQuestionDm } from "../slack/dm.js";
import { closeExpiredRecruitments } from "./close-recruitment.js";
import type { Deps, SlackMember } from "../types.js";

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

type SendableQuestion = {
  id: number;
  body: string;
  status: string;
  closedAt: Date | null;
  createdAt: Date;
  answers: { status: string }[];
  recipients: { recipientHash: string }[];
};

type ChannelAudience = {
  members: SlackMember[];
  botUserId: string;
};

export async function sendQuestions(deps: Deps): Promise<{
  sent: number;
  questions: number;
}> {
  const now = (deps.now ?? (() => new Date()))();
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

  const audience = await loadChannelAudience(deps);
  let sent = 0;
  for (const question of recruiting) {
    sent += await sendQuestionRound(deps, question, audience);
  }

  return { sent, questions: recruiting.length };
}

export async function sendQuestionById(
  deps: Deps,
  questionId: number,
): Promise<{ sent: number }> {
  const now = (deps.now ?? (() => new Date()))();
  await closeExpiredRecruitments(deps.db, now);

  const question = await deps.db.question.findUnique({
    where: { id: questionId },
    include: {
      answers: { select: { status: true } },
      recipients: { select: { recipientHash: true } },
    },
  });
  if (!question) {
    throw new AdminHttpError(404, "question not found");
  }
  if (!isRecruiting(question, now)) {
    throw new AdminHttpError(409, "question is not recruiting");
  }

  const audience = await loadChannelAudience(deps);
  const sent = await sendQuestionRound(deps, question, audience);
  return { sent };
}

async function loadChannelAudience(deps: Deps): Promise<ChannelAudience> {
  const members = await listChannelMembers(
    deps.slack,
    deps.config.slackChannelId,
  );
  const { botUserId } = await deps.slack.authTest();
  return { members, botUserId };
}

async function sendQuestionRound(
  deps: Deps,
  question: SendableQuestion,
  audience: ChannelAudience,
): Promise<number> {
  const sleep = deps.sleep ?? defaultSleep;
  const selected = selectRecipients({
    members: audience.members,
    existingHashes: question.recipients.map((row) => row.recipientHash),
    hmacSecret: deps.config.hmacSecret,
    count: RECIPIENTS_PER_ROUND,
    botUserId: audience.botUserId,
    random: deps.random,
  });

  let sent = 0;
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
  return sent;
}

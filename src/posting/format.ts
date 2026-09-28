import type { KnownBlock } from "@slack/types";
import { ACTION_ANSWER_OPEN } from "../constants.js";

function quoteMrkdwn(body: string): string {
  return body
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function formatChannelPost(params: {
  questionBody: string;
  answerBody: string;
  isAnonymous: boolean;
  answererSlackUserId: string | null;
}): string {
  const who =
    params.isAnonymous || !params.answererSlackUserId
      ? "誰か"
      : `<@${params.answererSlackUserId}>さん`;
  return [
    `そっと届いた質問に、${who}が答えてくれました 🙌`,
    "",
    quoteMrkdwn(params.questionBody),
    "",
    "**回答**",
    "",
    quoteMrkdwn(params.answerBody),
  ].join("\n");
}

export function buildChannelPost(params: {
  questionId: number;
  questionBody: string;
  answerBody: string;
  isAnonymous: boolean;
  answererSlackUserId: string | null;
}): {
  text: string;
  blocks: KnownBlock[];
} {
  const text = formatChannelPost(params);
  return {
    text,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "この質問に答える" },
            action_id: ACTION_ANSWER_OPEN,
            value: String(params.questionId),
          },
        ],
      },
    ],
  };
}

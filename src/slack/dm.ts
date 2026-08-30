import type { KnownBlock } from "@slack/types";
import { ACTION_ANSWER_OPEN } from "../constants.js";

export function buildQuestionDm(questionId: number, questionBody: string): {
  text: string;
  blocks: KnownBlock[];
} {
  const text = questionBody;
  return {
    text,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: questionBody },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "回答する" },
            action_id: ACTION_ANSWER_OPEN,
            value: String(questionId),
          },
        ],
      },
    ],
  };
}

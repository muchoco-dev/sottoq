import type { KnownBlock } from "@slack/types";
import { ACTION_ANSWER_OPEN } from "../constants.js";

function quoteQuestion(body: string): string {
  return body
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function buildQuestionDm(questionId: number, questionBody: string): {
  text: string;
  blocks: KnownBlock[];
} {
  const intro = [
    "あなたに、そっと質問が届きました 💭",
    "誰かが匿名で聞いてみたいことがあるようです。",
  ].join("\n");
  const quotedQuestion = quoteQuestion(questionBody);
  const outro = [
    "回答すると #04_質問 チャンネルに投稿されます。",
    "あなたの考えや経験を教えてください🙌",
  ].join("\n");
  const text = [intro, "", quotedQuestion, "", outro].join("\n");

  return {
    text,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: intro },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: quotedQuestion },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: outro },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "質問に答える" },
            action_id: ACTION_ANSWER_OPEN,
            value: String(questionId),
          },
        ],
      },
    ],
  };
}

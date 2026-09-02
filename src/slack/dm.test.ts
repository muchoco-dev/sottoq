import { describe, expect, it } from "vitest";
import { ACTION_ANSWER_OPEN } from "../constants.js";
import { buildQuestionDm } from "./dm.js";

describe("buildQuestionDm", () => {
  it("keeps the question in its own block, with intro, outro, and 質問に答える", () => {
    const message = buildQuestionDm(12, "好きな飲み物は？");
    const intro = [
      "あなたに、そっと質問が届きました 💭",
      "誰かが匿名で聞いてみたいことがあるようです。",
    ].join("\n");
    const quotedQuestion = "> 好きな飲み物は？";
    const outro = [
      "回答すると #04_質問 チャンネルに投稿されます。",
      "あなたの考えや経験を教えてください🙌",
    ].join("\n");

    expect(message.text).toBe(
      [intro, "", quotedQuestion, "", outro].join("\n"),
    );
    expect(message.blocks).toEqual([
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
            value: "12",
          },
        ],
      },
    ]);
  });

  it("prefixes every line of a multiline question with a quote marker", () => {
    const message = buildQuestionDm(1, "1行目\n2行目");
    const questionBlock = message.blocks[1];
    expect(questionBlock).toMatchObject({
      type: "section",
      text: { type: "mrkdwn", text: "> 1行目\n> 2行目" },
    });
  });
});

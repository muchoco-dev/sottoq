import type { View } from "@slack/types";
import {
  ACTION_ANSWER_INPUT,
  ACTION_ANONYMITY,
  ANONYMITY_ANONYMOUS,
  ANONYMITY_NAMED,
  BLOCK_ANSWER,
  BLOCK_ANONYMITY,
  VIEW_ANSWER_SUBMIT,
} from "../constants.js";

export function buildAnswerModal(questionId: number): View {
  return {
    type: "modal",
    callback_id: VIEW_ANSWER_SUBMIT,
    private_metadata: JSON.stringify({ questionId }),
    title: { type: "plain_text", text: "回答する" },
    submit: { type: "plain_text", text: "送信" },
    close: { type: "plain_text", text: "キャンセル" },
    blocks: [
      {
        type: "input",
        block_id: BLOCK_ANSWER,
        label: { type: "plain_text", text: "回答" },
        element: {
          type: "plain_text_input",
          action_id: ACTION_ANSWER_INPUT,
          multiline: true,
          placeholder: { type: "plain_text", text: "回答を入力してください" },
        },
      },
      {
        type: "input",
        block_id: BLOCK_ANONYMITY,
        label: { type: "plain_text", text: "公開方法" },
        element: {
          type: "radio_buttons",
          action_id: ACTION_ANONYMITY,
          initial_option: {
            text: { type: "plain_text", text: "匿名で回答する" },
            value: ANONYMITY_ANONYMOUS,
          },
          options: [
            {
              text: { type: "plain_text", text: "匿名で回答する" },
              value: ANONYMITY_ANONYMOUS,
            },
            {
              text: { type: "plain_text", text: "名前を出して回答する" },
              value: ANONYMITY_NAMED,
            },
          ],
        },
      },
    ],
  };
}

export function parseAnswerMetadata(raw: string): { questionId?: number } {
  try {
    const parsed = JSON.parse(raw) as { questionId?: number };
    return parsed;
  } catch {
    return {};
  }
}

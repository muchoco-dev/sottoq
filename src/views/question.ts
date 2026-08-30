import type { View } from "@slack/types";
import {
  ACTION_QUESTION_INPUT,
  BLOCK_QUESTION,
  VIEW_QUESTION_SUBMIT,
} from "../constants.js";

export function buildQuestionModal(channelId: string): View {
  return {
    type: "modal",
    callback_id: VIEW_QUESTION_SUBMIT,
    private_metadata: JSON.stringify({ channelId }),
    title: { type: "plain_text", text: "匿名で質問する" },
    submit: { type: "plain_text", text: "送信" },
    close: { type: "plain_text", text: "キャンセル" },
    blocks: [
      {
        type: "input",
        block_id: BLOCK_QUESTION,
        label: { type: "plain_text", text: "質問" },
        element: {
          type: "plain_text_input",
          action_id: ACTION_QUESTION_INPUT,
          multiline: true,
          placeholder: { type: "plain_text", text: "質問を入力してください" },
        },
      },
    ],
  };
}

export function parseQuestionMetadata(raw: string): { channelId?: string } {
  try {
    const parsed = JSON.parse(raw) as { channelId?: string };
    return parsed;
  } catch {
    return {};
  }
}

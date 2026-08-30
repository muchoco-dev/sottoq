import type { App } from "@slack/bolt";
import {
  ACTION_QUESTION_INPUT,
  ASK_COMMAND,
  BLOCK_QUESTION,
  VIEW_QUESTION_SUBMIT,
} from "../constants.js";
import { buildQuestionModal, parseQuestionMetadata } from "../views/question.js";
import type { Db, Logger, SlackApi } from "../types.js";

export async function saveQuestion(db: Db, body: string) {
  return db.question.create({
    data: {
      body: body.trim(),
      status: "pending",
    },
  });
}

export function registerAskHandlers(
  app: App,
  deps: { db: Db; slack: SlackApi; logger: Logger },
): void {
  app.command(ASK_COMMAND, async ({ ack, body }) => {
    await ack();
    await deps.slack.viewsOpen({
      triggerId: body.trigger_id,
      view: buildQuestionModal(body.channel_id),
    });
  });

  app.view(VIEW_QUESTION_SUBMIT, async ({ ack, view, body }) => {
    const text =
      view.state.values[BLOCK_QUESTION]?.[ACTION_QUESTION_INPUT]?.value ?? "";
    if (!text.trim()) {
      await ack({
        response_action: "errors",
        errors: { [BLOCK_QUESTION]: "質問を入力してください" },
      });
      return;
    }

    try {
      await saveQuestion(deps.db, text);
    } catch {
      deps.logger.error("failed to save question");
      await ack({
        response_action: "errors",
        errors: {
          [BLOCK_QUESTION]: "保存に失敗しました。しばらくして再度お試しください",
        },
      });
      return;
    }

    await ack();

    const meta = parseQuestionMetadata(view.private_metadata);
    const userId = body.user?.id;
    if (meta.channelId && userId) {
      try {
        await deps.slack.postEphemeral({
          channel: meta.channelId,
          user: userId,
          text: "質問を受け付けました。承認後にメンバーへ届きます",
        });
      } catch {
        deps.logger.error("failed to send question receipt");
      }
    }
  });
}

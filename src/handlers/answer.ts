import type { App } from "@slack/bolt";
import {
  ACTION_ANSWER_INPUT,
  ACTION_ANSWER_OPEN,
  ACTION_ANONYMITY,
  ANONYMITY_NAMED,
  BLOCK_ANSWER,
  BLOCK_ANONYMITY,
  VIEW_ANSWER_SUBMIT,
} from "../constants.js";
import { buildAnswerModal, parseAnswerMetadata } from "../views/answer.js";
import type { Db, Logger, SlackApi } from "../types.js";

export async function saveAnswer(
  db: Db,
  params: {
    questionId: number;
    body: string;
    isAnonymous: boolean;
    slackUserId: string;
  },
) {
  return db.answer.create({
    data: {
      questionId: params.questionId,
      body: params.body.trim(),
      isAnonymous: params.isAnonymous,
      answererSlackUserId: params.isAnonymous ? null : params.slackUserId,
      status: "pending",
    },
  });
}

export function registerAnswerHandlers(
  app: App,
  deps: { db: Db; slack: SlackApi; logger: Logger },
): void {
  app.action(ACTION_ANSWER_OPEN, async ({ ack, body, action }) => {
    await ack();
    if (action.type !== "button" || !("trigger_id" in body)) {
      return;
    }
    const questionId = Number(action.value);
    if (!Number.isFinite(questionId)) {
      return;
    }
    await deps.slack.viewsOpen({
      triggerId: body.trigger_id,
      view: buildAnswerModal(questionId),
    });
  });

  app.view(VIEW_ANSWER_SUBMIT, async ({ ack, view, body }) => {
    const text =
      view.state.values[BLOCK_ANSWER]?.[ACTION_ANSWER_INPUT]?.value ?? "";
    const anonymity =
      view.state.values[BLOCK_ANONYMITY]?.[ACTION_ANONYMITY]?.selected_option
        ?.value ?? "";
    const meta = parseAnswerMetadata(view.private_metadata);
    const slackUserId = body.user.id;

    if (!text.trim()) {
      await ack({
        response_action: "errors",
        errors: { [BLOCK_ANSWER]: "回答を入力してください" },
      });
      return;
    }
    if (!meta.questionId) {
      await ack({
        response_action: "errors",
        errors: { [BLOCK_ANSWER]: "質問を特定できませんでした" },
      });
      return;
    }

    const isAnonymous = anonymity !== ANONYMITY_NAMED;

    try {
      await saveAnswer(deps.db, {
        questionId: meta.questionId,
        body: text,
        isAnonymous,
        slackUserId,
      });
    } catch {
      deps.logger.error("failed to save answer");
      await ack({
        response_action: "errors",
        errors: {
          [BLOCK_ANSWER]: "保存に失敗しました。しばらくして再度お試しください",
        },
      });
      return;
    }

    await ack();
  });
}

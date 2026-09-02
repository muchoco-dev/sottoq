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

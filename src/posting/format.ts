export function formatChannelPost(params: {
  questionBody: string;
  answerBody: string;
  isAnonymous: boolean;
  answererSlackUserId: string | null;
}): string {
  const question = `Q. ${params.questionBody}`;
  if (params.isAnonymous || !params.answererSlackUserId) {
    return `${question}\n\nA.\n${params.answerBody}`;
  }
  return `${question}\n\nA. <@${params.answererSlackUserId}> さん\n${params.answerBody}`;
}

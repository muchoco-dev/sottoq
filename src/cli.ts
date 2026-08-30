import { loadConfig } from "./config.js";
import { createPrisma } from "./db/client.js";
import { closeExpiredRecruitments } from "./jobs/close-recruitment.js";
import { postApprovedAnswers } from "./jobs/post-answers.js";
import { sendQuestions } from "./jobs/send-questions.js";
import { createSlackApi } from "./slack/api.js";
import { WebClient } from "@slack/web-api";
import type { Logger } from "./types.js";

const logger: Logger = {
  info: (message) => console.info(message),
  error: (message) => console.error(message),
};

async function main(): Promise<void> {
  const command = process.argv[2];
  const config = loadConfig();
  const db = createPrisma();
  const slack = createSlackApi(new WebClient(config.slackBotToken));
  const deps = { db, slack, config, logger };

  try {
    if (command === "send") {
      const result = await sendQuestions(deps);
      logger.info(`sent=${result.sent} questions=${result.questions}`);
    } else if (command === "post") {
      const posted = await postApprovedAnswers(deps);
      logger.info(`posted=${posted}`);
    } else if (command === "close") {
      const closed = await closeExpiredRecruitments(db, new Date());
      logger.info(`closed=${closed}`);
    } else {
      logger.error("usage: tsx src/cli.ts [send|post|close]");
      process.exitCode = 1;
    }
  } finally {
    await db.$disconnect();
  }
}

void main();

import cron from "node-cron";
import { closeExpiredRecruitments } from "./close-recruitment.js";
import { postApprovedAnswers } from "./post-answers.js";
import { sendQuestions } from "./send-questions.js";
import type { Deps } from "../types.js";

export function startJobs(deps: Deps): void {
  const timezone = deps.config.timezone;

  cron.schedule(
    "0 9,20 * * *",
    () => {
      void sendQuestions(deps);
    },
    { timezone },
  );

  cron.schedule(
    "0 12 * * *",
    () => {
      void postApprovedAnswers(deps);
    },
    { timezone },
  );

  cron.schedule(
    "30 20 * * *",
    () => {
      void postApprovedAnswers(deps);
    },
    { timezone },
  );

  cron.schedule(
    "0 * * * *",
    () => {
      void closeExpiredRecruitments(deps.db, (deps.now ?? (() => new Date()))());
    },
    { timezone },
  );
}

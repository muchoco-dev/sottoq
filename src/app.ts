import { createServer } from "node:http";
import { App, ExpressReceiver } from "@slack/bolt";
import { attachAdminRoutes, handlePublicHttp } from "./admin/http.js";
import { loadConfig } from "./config.js";
import { createPrisma } from "./db/client.js";
import { registerAnswerHandlers } from "./handlers/answer.js";
import { registerAskHandlers } from "./handlers/ask.js";
import { startJobs } from "./jobs/schedule.js";
import { createSlackApi } from "./slack/api.js";
import type { Deps, Logger } from "./types.js";

const logger: Logger = {
  info: (message) => {
    console.info(message);
  },
  error: (message) => {
    console.error(message);
  },
};

function startHttpServer(port: number, deps: Deps): void {
  const server = createServer((req, res) => {
    void handlePublicHttp(req, res, deps).catch(() => {
      deps.logger.error("http request failed");
      if (!res.headersSent) {
        res.writeHead(500);
        res.end();
      }
    });
  });
  server.listen(port);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createPrisma();

  let receiver: ExpressReceiver | undefined;
  const app = config.socketMode
    ? new App({
        token: config.slackBotToken,
        signingSecret: config.slackSigningSecret,
        socketMode: true,
        appToken: config.slackAppToken,
      })
    : (() => {
        receiver = new ExpressReceiver({
          signingSecret: config.slackSigningSecret,
          endpoints: "/slack/events",
        });
        receiver.router.get("/health", (_req, res) => {
          res.json({ ok: true });
        });
        return new App({
          token: config.slackBotToken,
          receiver,
        });
      })();

  const slack = createSlackApi(app.client);
  const deps = { db, slack, config, logger };

  registerAskHandlers(app, deps);
  registerAnswerHandlers(app, deps);
  startJobs(deps);
  if (receiver) {
    attachAdminRoutes(receiver.router, deps);
  }

  if (config.socketMode) {
    await app.start();
    startHttpServer(config.port, deps);
  } else {
    await app.start(config.port);
  }
  logger.info(`listening on ${config.port}`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "startup failed";
  console.error(message);
  process.exit(1);
});

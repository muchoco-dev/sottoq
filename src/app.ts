import { createServer } from "node:http";
import { App, ExpressReceiver } from "@slack/bolt";
import { loadConfig } from "./config.js";
import { createPrisma } from "./db/client.js";
import { registerAnswerHandlers } from "./handlers/answer.js";
import { registerAskHandlers } from "./handlers/ask.js";
import { startJobs } from "./jobs/schedule.js";
import { createSlackApi } from "./slack/api.js";
import type { Logger } from "./types.js";

const logger: Logger = {
  info: (message) => {
    console.info(message);
  },
  error: (message) => {
    console.error(message);
  },
};

function startHealthServer(port: number): void {
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createPrisma();

  const app = config.socketMode
    ? new App({
        token: config.slackBotToken,
        signingSecret: config.slackSigningSecret,
        socketMode: true,
        appToken: config.slackAppToken,
      })
    : (() => {
        const receiver = new ExpressReceiver({
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

  if (config.socketMode) {
    await app.start();
    startHealthServer(config.port);
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

import "dotenv/config";
import type { AppConfig } from "./types.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が未設定です`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const socketMode =
    process.env.SLACK_SOCKET_MODE === "1" ||
    process.env.SLACK_SOCKET_MODE === "true";

  if (socketMode && !process.env.SLACK_APP_TOKEN) {
    throw new Error("Socket Mode では環境変数 SLACK_APP_TOKEN が必要です");
  }

  return {
    slackBotToken: required("SLACK_BOT_TOKEN"),
    slackSigningSecret: required("SLACK_SIGNING_SECRET"),
    slackAppToken: process.env.SLACK_APP_TOKEN,
    slackChannelId: required("SLACK_CHANNEL_ID"),
    hmacSecret: required("HMAC_SECRET"),
    databaseUrl: required("DATABASE_URL"),
    port: Number(process.env.PORT ?? 3000),
    timezone: process.env.TZ ?? "Asia/Tokyo",
    socketMode,
  };
}

import type { PrismaClient } from "@prisma/client";
import type { KnownBlock, View } from "@slack/types";

export type Logger = {
  info: (message: string) => void;
  error: (message: string) => void;
};

export type SlackMember = {
  id?: string;
  deleted?: boolean;
  is_bot?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
};

export type SlackApi = {
  usersList: (cursor?: string) => Promise<{
    members: SlackMember[];
    nextCursor?: string;
  }>;
  conversationsOpen: (userId: string) => Promise<{ channelId: string }>;
  postMessage: (args: {
    channel: string;
    text: string;
    blocks?: KnownBlock[];
  }) => Promise<void>;
  postEphemeral: (args: {
    channel: string;
    user: string;
    text: string;
  }) => Promise<void>;
  viewsOpen: (args: { triggerId: string; view: View }) => Promise<void>;
  authTest: () => Promise<{ botUserId: string }>;
};

export type AppConfig = {
  slackBotToken: string;
  slackSigningSecret: string;
  slackAppToken?: string;
  slackChannelId: string;
  hmacSecret: string;
  databaseUrl: string;
  port: number;
  timezone: string;
  socketMode: boolean;
};

export type Db = PrismaClient;

export type Deps = {
  db: Db;
  slack: SlackApi;
  config: AppConfig;
  logger: Logger;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  dmIntervalMs?: number;
  postIntervalMs?: number;
  maxPosts?: number;
};

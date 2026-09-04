import { vi } from "vitest";
import type { AppConfig, Logger, SlackApi } from "../types.js";

export function createLogger(): Logger {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

export function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    slackBotToken: "xoxb-test",
    slackSigningSecret: "signing",
    slackChannelId: "C123",
    hmacSecret: "hmac-secret",
    databaseUrl: "mysql://app:app@localhost:3306/test",
    port: 3000,
    timezone: "Asia/Tokyo",
    socketMode: true,
    ...overrides,
  };
}

export function createSlackMock(overrides: Partial<SlackApi> = {}): SlackApi {
  return {
    usersList: vi.fn(async () => ({ members: [] })),
    conversationsMembers: vi.fn(async () => ({ memberIds: [] })),
    conversationsOpen: vi.fn(async (userId) => ({ channelId: `D-${userId}` })),
    postMessage: vi.fn(async () => undefined),
    postEphemeral: vi.fn(async () => undefined),
    viewsOpen: vi.fn(async () => undefined),
    authTest: vi.fn(async () => ({ botUserId: "B0TB0T" })),
    ...overrides,
  };
}

export function createPrismaMock() {
  const prisma = {
    question: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    answer: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    questionRecipient: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
    fn(prisma),
  );

  return prisma;
}

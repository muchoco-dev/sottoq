import { describe, expect, it } from "vitest";
import { hmacUserId } from "../anonymity/hmac.js";
import { sendQuestionById, sendQuestions } from "./send-questions.js";
import {
  createConfig,
  createLogger,
  createPrismaMock,
  createSlackMock,
} from "../test/mocks.js";

const now = new Date("2026-08-10T09:00:00+09:00");
const hmacSecret = "hmac-secret";

describe("sendQuestions", () => {
  it("sends DMs to members who have not received the question yet", async () => {
    const db = createPrismaMock();
    const existingHash = hmacUserId(hmacSecret, "U1");
    db.question.findMany.mockResolvedValue([
      {
        id: 1,
        body: "質問です",
        status: "approved",
        closedAt: null,
        createdAt: now,
        answers: [],
        recipients: [{ recipientHash: existingHash }],
      },
    ]);
    db.questionRecipient.create.mockResolvedValue({});

    const slack = createSlackMock({
      conversationsMembers: async () => ({
        memberIds: ["U1", "U2", "B0TB0T", "USLACKBOT"],
      }),
      usersList: async () => ({
        members: [
          { id: "U1" },
          { id: "U2" },
          { id: "B0TB0T", is_bot: true },
          { id: "USLACKBOT" },
        ],
      }),
    });

    const result = await sendQuestions({
      db: db as never,
      slack,
      config: createConfig({ hmacSecret }),
      logger: createLogger(),
      now: () => now,
      dmIntervalMs: 0,
      random: () => 0,
    });

    expect(result.sent).toBe(1);
    expect(slack.conversationsOpen).toHaveBeenCalledWith("U2");
    expect(slack.postMessage).toHaveBeenCalledTimes(1);
    expect(db.questionRecipient.create).toHaveBeenCalledWith({
      data: {
        questionId: 1,
        recipientHash: hmacUserId(hmacSecret, "U2"),
      },
    });
  });

  it("does not record a recipient hash when DM sending fails", async () => {
    const db = createPrismaMock();
    db.question.findMany.mockResolvedValue([
      {
        id: 1,
        body: "質問です",
        status: "approved",
        closedAt: null,
        createdAt: now,
        answers: [],
        recipients: [],
      },
    ]);
    const slack = createSlackMock({
      conversationsMembers: async () => ({ memberIds: ["U2"] }),
      usersList: async () => ({ members: [{ id: "U2" }] }),
      postMessage: async () => {
        throw new Error("rate limited");
      },
    });

    const result = await sendQuestions({
      db: db as never,
      slack,
      config: createConfig({ hmacSecret }),
      logger: createLogger(),
      now: () => now,
      dmIntervalMs: 0,
    });

    expect(result.sent).toBe(0);
    expect(db.questionRecipient.create).not.toHaveBeenCalled();
  });

  it("does not send for pending or already closed questions", async () => {
    const db = createPrismaMock();
    db.question.findMany.mockResolvedValue([]);
    const slack = createSlackMock();

    const result = await sendQuestions({
      db: db as never,
      slack,
      config: createConfig(),
      logger: createLogger(),
      now: () => now,
      dmIntervalMs: 0,
    });

    expect(result).toEqual({ sent: 0, questions: 0 });
    expect(slack.postMessage).not.toHaveBeenCalled();
  });

  it("does not send to workspace members outside the posting channel", async () => {
    const db = createPrismaMock();
    db.question.findMany.mockResolvedValue([
      {
        id: 1,
        body: "質問です",
        status: "approved",
        closedAt: null,
        createdAt: now,
        answers: [],
        recipients: [],
      },
    ]);
    db.questionRecipient.create.mockResolvedValue({});

    const slack = createSlackMock({
      conversationsMembers: async () => ({ memberIds: ["U2"] }),
      usersList: async () => ({
        members: [{ id: "U2" }, { id: "U3" }],
      }),
    });

    const result = await sendQuestions({
      db: db as never,
      slack,
      config: createConfig({ hmacSecret }),
      logger: createLogger(),
      now: () => now,
      dmIntervalMs: 0,
      random: () => 0,
    });

    expect(result.sent).toBe(1);
    expect(slack.conversationsOpen).toHaveBeenCalledWith("U2");
    expect(slack.conversationsOpen).not.toHaveBeenCalledWith("U3");
    expect(slack.postMessage).toHaveBeenCalledTimes(1);
  });
});

describe("sendQuestionById", () => {
  it("sends one recruiting question immediately", async () => {
    const db = createPrismaMock();
    db.question.findMany.mockResolvedValue([]);
    db.question.findUnique.mockResolvedValue({
      id: 1,
      body: "質問です",
      status: "approved",
      closedAt: null,
      createdAt: now,
      answers: [],
      recipients: [],
    });
    db.questionRecipient.create.mockResolvedValue({});
    const slack = createSlackMock({
      conversationsMembers: async () => ({ memberIds: ["U2"] }),
      usersList: async () => ({ members: [{ id: "U2" }] }),
    });

    const result = await sendQuestionById(
      {
        db: db as never,
        slack,
        config: createConfig({ hmacSecret }),
        logger: createLogger(),
        now: () => now,
        dmIntervalMs: 0,
        random: () => 0,
      },
      1,
    );

    expect(result.sent).toBe(1);
    expect(slack.conversationsOpen).toHaveBeenCalledWith("U2");
  });

  it("rejects questions that are not recruiting", async () => {
    const db = createPrismaMock();
    db.question.findMany.mockResolvedValue([]);
    db.question.findUnique.mockResolvedValue({
      id: 1,
      body: "質問です",
      status: "pending",
      closedAt: null,
      createdAt: now,
      answers: [],
      recipients: [],
    });

    await expect(
      sendQuestionById(
        {
          db: db as never,
          slack: createSlackMock(),
          config: createConfig(),
          logger: createLogger(),
          now: () => now,
          dmIntervalMs: 0,
        },
        1,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

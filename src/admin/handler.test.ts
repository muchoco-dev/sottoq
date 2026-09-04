import { describe, expect, it } from "vitest";
import { hmacUserId } from "../anonymity/hmac.js";
import { dispatchAdmin } from "./handler.js";
import {
  createConfig,
  createLogger,
  createPrismaMock,
  createSlackMock,
} from "../test/mocks.js";
import type { Deps } from "../types.js";

const now = new Date("2026-08-10T09:00:00+09:00");
const hmacSecret = "hmac-secret";
const token = "admin-secret";

function createDeps(overrides: {
  db?: ReturnType<typeof createPrismaMock>;
  slack?: ReturnType<typeof createSlackMock>;
  adminApiToken?: string;
} = {}): Deps {
  return {
    db: (overrides.db ?? createPrismaMock()) as never,
    slack: overrides.slack ?? createSlackMock(),
    config: createConfig({
      hmacSecret,
      adminApiToken: overrides.adminApiToken ?? token,
    }),
    logger: createLogger(),
    now: () => now,
    dmIntervalMs: 0,
    postIntervalMs: 0,
    random: () => 0,
  };
}

describe("dispatchAdmin", () => {
  it("returns 404 when the admin token is not configured", async () => {
    const response = await dispatchAdmin(createDeps({ adminApiToken: "" }), {
      method: "GET",
      pathname: "/admin/questions",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });
    expect(response.status).toBe(404);
  });

  it("returns 401 without a matching bearer token", async () => {
    const response = await dispatchAdmin(createDeps(), {
      method: "GET",
      pathname: "/admin/questions",
      searchParams: new URLSearchParams(),
      authorization: "Bearer wrong",
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid status filter", async () => {
    const response = await dispatchAdmin(createDeps(), {
      method: "GET",
      pathname: "/admin/questions",
      searchParams: new URLSearchParams("status=nope"),
      authorization: `Bearer ${token}`,
    });
    expect(response.status).toBe(400);
  });

  it("lists questions without recipient hashes and with a recruiting flag", async () => {
    const db = createPrismaMock();
    db.question.findMany.mockResolvedValue([
      {
        id: 1,
        body: "質問です",
        status: "approved",
        createdAt: now,
        moderatedAt: now,
        closedAt: null,
        recipientCount: null,
        answerCount: null,
        answers: [],
        _count: { recipients: 2 },
      },
    ]);

    const response = await dispatchAdmin(createDeps({ db }), {
      method: "GET",
      pathname: "/admin/questions",
      searchParams: new URLSearchParams("status=approved"),
      authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        body: "質問です",
        status: "approved",
        createdAt: now.toISOString(),
        moderatedAt: now.toISOString(),
        closedAt: null,
        recruiting: true,
        recipientCount: 2,
        answerCount: 0,
      },
    ]);
    expect(JSON.stringify(response.body)).not.toContain("recipientHash");
  });

  it("lists answers and hides named user ids for anonymous answers", async () => {
    const db = createPrismaMock();
    db.answer.findMany.mockResolvedValue([
      {
        id: 10,
        questionId: 1,
        body: "匿名です",
        isAnonymous: true,
        answererSlackUserId: "U-should-hide",
        status: "pending",
        postedAt: null,
        createdAt: now,
        question: { id: 1, body: "質問です", status: "approved" },
      },
    ]);

    const response = await dispatchAdmin(createDeps({ db }), {
      method: "GET",
      pathname: "/admin/answers",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 10,
        questionId: 1,
        body: "匿名です",
        isAnonymous: true,
        answererSlackUserId: null,
        status: "pending",
        postedAt: null,
        createdAt: now.toISOString(),
        question: { id: 1, body: "質問です", status: "approved" },
      },
    ]);
  });

  it("approves a pending question", async () => {
    const db = createPrismaMock();
    db.question.updateMany.mockResolvedValue({ count: 1 });

    const response = await dispatchAdmin(createDeps({ db }), {
      method: "POST",
      pathname: "/admin/questions/1/approve",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });

    expect(response).toEqual({ status: 200, body: { ok: true } });
    expect(db.question.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: "pending" },
      data: { status: "approved", moderatedAt: now },
    });
  });

  it("returns 409 when approving a non-pending question", async () => {
    const db = createPrismaMock();
    db.question.updateMany.mockResolvedValue({ count: 0 });
    db.question.findUnique.mockResolvedValue({ id: 1, status: "approved" });

    const response = await dispatchAdmin(createDeps({ db }), {
      method: "POST",
      pathname: "/admin/questions/1/approve",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(409);
  });

  it("sends DMs immediately for a recruiting question", async () => {
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

    const response = await dispatchAdmin(createDeps({ db, slack }), {
      method: "POST",
      pathname: "/admin/questions/1/send",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });

    expect(response).toEqual({ status: 200, body: { sent: 1 } });
    expect(slack.conversationsOpen).toHaveBeenCalledWith("U2");
    expect(db.questionRecipient.create).toHaveBeenCalledWith({
      data: {
        questionId: 1,
        recipientHash: hmacUserId(hmacSecret, "U2"),
      },
    });
  });

  it("returns 409 when sending DMs for a question that is not recruiting", async () => {
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

    const response = await dispatchAdmin(createDeps({ db }), {
      method: "POST",
      pathname: "/admin/questions/1/send",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(409);
  });

  it("posts an approved unposted answer immediately", async () => {
    const db = createPrismaMock();
    db.answer.findUnique.mockResolvedValue({
      id: 8,
      body: "水です",
      isAnonymous: true,
      answererSlackUserId: null,
      status: "approved",
      postedAt: null,
      question: { body: "好きな飲み物は？" },
    });
    db.answer.updateMany.mockResolvedValue({ count: 1 });

    const slack = createSlackMock();
    const response = await dispatchAdmin(createDeps({ db, slack }), {
      method: "POST",
      pathname: "/admin/answers/8/post",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });

    expect(response).toEqual({ status: 200, body: { posted: true } });
    expect(db.answer.updateMany).toHaveBeenCalledWith({
      where: { id: 8, status: "approved", postedAt: null },
      data: { postedAt: now },
    });
    expect(slack.postMessage).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when posting an answer that is not approved or already posted", async () => {
    const db = createPrismaMock();
    db.answer.findUnique.mockResolvedValue({
      id: 8,
      body: "水です",
      isAnonymous: true,
      answererSlackUserId: null,
      status: "pending",
      postedAt: null,
      question: { body: "好きな飲み物は？" },
    });

    const response = await dispatchAdmin(createDeps({ db }), {
      method: "POST",
      pathname: "/admin/answers/8/post",
      searchParams: new URLSearchParams(),
      authorization: `Bearer ${token}`,
    });

    expect(response.status).toBe(409);
    expect(db.answer.updateMany).not.toHaveBeenCalled();
  });
});

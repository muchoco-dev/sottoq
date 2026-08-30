import { describe, expect, it } from "vitest";
import { saveQuestion } from "./ask.js";
import { createPrismaMock } from "../test/mocks.js";

describe("saveQuestion", () => {
  it("stores only the body and pending status, without a user id", async () => {
    const db = createPrismaMock();
    db.question.create.mockResolvedValue({ id: 1, body: "hello" });

    await saveQuestion(db as never, "  hello  ");

    expect(db.question.create).toHaveBeenCalledTimes(1);
    const arg = db.question.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data).toEqual({ body: "hello", status: "pending" });
    expect(arg.data).not.toHaveProperty("userId");
    expect(arg.data).not.toHaveProperty("slackUserId");
    expect(arg.data).not.toHaveProperty("answererSlackUserId");
  });
});

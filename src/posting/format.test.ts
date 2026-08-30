import { describe, expect, it } from "vitest";
import { formatChannelPost } from "./format.js";

describe("formatChannelPost", () => {
  it("formats an anonymous answer", () => {
    expect(
      formatChannelPost({
        questionBody: "好きな飲み物は？",
        answerBody: "水です",
        isAnonymous: true,
        answererSlackUserId: null,
      }),
    ).toBe("Q. 好きな飲み物は？\n\nA.\n水です");
  });

  it("formats a named answer with さん after the mention", () => {
    expect(
      formatChannelPost({
        questionBody: "好きな飲み物は？",
        answerBody: "コーヒーです",
        isAnonymous: false,
        answererSlackUserId: "U123",
      }),
    ).toBe("Q. 好きな飲み物は？\n\nA. <@U123> さん\nコーヒーです");
  });

  it("treats missing user id as anonymous even if isAnonymous is false", () => {
    expect(
      formatChannelPost({
        questionBody: "Q1",
        answerBody: "A1",
        isAnonymous: false,
        answererSlackUserId: null,
      }),
    ).toBe("Q. Q1\n\nA.\nA1");
  });
});

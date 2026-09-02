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
    ).toBe(
      [
        "そっと届いた質問に、誰かが答えてくれました 🙌",
        "",
        "> 好きな飲み物は？",
        "",
        "**回答**",
        "",
        "> 水です",
      ].join("\n"),
    );
  });

  it("formats a named answer with the mention in the intro", () => {
    expect(
      formatChannelPost({
        questionBody: "好きな飲み物は？",
        answerBody: "コーヒーです",
        isAnonymous: false,
        answererSlackUserId: "U123",
      }),
    ).toBe(
      [
        "そっと届いた質問に、<@U123>さんが答えてくれました 🙌",
        "",
        "> 好きな飲み物は？",
        "",
        "**回答**",
        "",
        "> コーヒーです",
      ].join("\n"),
    );
  });

  it("treats missing user id as anonymous even if isAnonymous is false", () => {
    expect(
      formatChannelPost({
        questionBody: "Q1",
        answerBody: "A1",
        isAnonymous: false,
        answererSlackUserId: null,
      }),
    ).toBe(
      [
        "そっと届いた質問に、誰かが答えてくれました 🙌",
        "",
        "> Q1",
        "",
        "**回答**",
        "",
        "> A1",
      ].join("\n"),
    );
  });

  it("quotes each line of multiline questions and answers", () => {
    expect(
      formatChannelPost({
        questionBody: "1行目\n2行目",
        answerBody: "A1\nA2",
        isAnonymous: true,
        answererSlackUserId: null,
      }),
    ).toBe(
      [
        "そっと届いた質問に、誰かが答えてくれました 🙌",
        "",
        "> 1行目",
        "> 2行目",
        "",
        "**回答**",
        "",
        "> A1",
        "> A2",
      ].join("\n"),
    );
  });
});

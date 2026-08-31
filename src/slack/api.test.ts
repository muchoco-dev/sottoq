import { describe, expect, it, vi } from "vitest";
import { listAllMembers, listChannelMembers } from "./api.js";
import { createSlackMock } from "../test/mocks.js";

describe("listAllMembers", () => {
  it("follows pagination cursors", async () => {
    const slack = createSlackMock({
      usersList: vi
        .fn()
        .mockResolvedValueOnce({
          members: [{ id: "U1" }],
          nextCursor: "page2",
        })
        .mockResolvedValueOnce({
          members: [{ id: "U2" }],
        }),
    });

    const members = await listAllMembers(slack);
    expect(members.map((member) => member.id)).toEqual(["U1", "U2"]);
    expect(slack.usersList).toHaveBeenNthCalledWith(1, undefined);
    expect(slack.usersList).toHaveBeenNthCalledWith(2, "page2");
  });
});

describe("listChannelMembers", () => {
  it("follows pagination cursors and keeps only channel members", async () => {
    const slack = createSlackMock({
      conversationsMembers: vi
        .fn()
        .mockResolvedValueOnce({
          memberIds: ["U1"],
          nextCursor: "page2",
        })
        .mockResolvedValueOnce({
          memberIds: ["U2"],
        }),
      usersList: async () => ({
        members: [{ id: "U1" }, { id: "U2" }, { id: "U3" }],
      }),
    });

    const members = await listChannelMembers(slack, "C123");
    expect(members.map((member) => member.id)).toEqual(["U1", "U2"]);
    expect(slack.conversationsMembers).toHaveBeenNthCalledWith(
      1,
      "C123",
      undefined,
    );
    expect(slack.conversationsMembers).toHaveBeenNthCalledWith(2, "C123", "page2");
  });
});

import { describe, expect, it, vi } from "vitest";
import { listAllMembers } from "./api.js";
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

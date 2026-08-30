import type { WebClient } from "@slack/web-api";
import type { SlackApi, SlackMember } from "../types.js";

export function createSlackApi(client: WebClient): SlackApi {
  return {
    async usersList(cursor) {
      const res = await client.users.list({ cursor, limit: 200 });
      return {
        members: (res.members ?? []) as SlackMember[],
        nextCursor: res.response_metadata?.next_cursor || undefined,
      };
    },
    async conversationsOpen(userId) {
      const res = await client.conversations.open({ users: userId });
      const channelId = res.channel?.id;
      if (!channelId) {
        throw new Error("DM チャンネルを開けませんでした");
      }
      return { channelId };
    },
    async postMessage(args) {
      await client.chat.postMessage({
        channel: args.channel,
        text: args.text,
        blocks: args.blocks,
      });
    },
    async postEphemeral(args) {
      await client.chat.postEphemeral({
        channel: args.channel,
        user: args.user,
        text: args.text,
      });
    },
    async viewsOpen(args) {
      await client.views.open({
        trigger_id: args.triggerId,
        view: args.view,
      });
    },
    async authTest() {
      const res = await client.auth.test();
      const botUserId = res.user_id;
      if (!botUserId) {
        throw new Error("ボットユーザー ID を取得できませんでした");
      }
      return { botUserId };
    },
  };
}

export async function listAllMembers(slack: SlackApi): Promise<SlackMember[]> {
  const members: SlackMember[] = [];
  let cursor: string | undefined;
  do {
    const page = await slack.usersList(cursor);
    members.push(...page.members);
    cursor = page.nextCursor;
  } while (cursor);
  return members;
}

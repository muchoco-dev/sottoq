import { USLACKBOT_ID } from "../constants.js";
import { hmacUserId } from "../anonymity/hmac.js";
import type { SlackMember } from "../types.js";

export function isEligibleMember(
  member: SlackMember,
  botUserId: string,
): boolean {
  if (!member.id) {
    return false;
  }
  if (member.id === USLACKBOT_ID || member.id === botUserId) {
    return false;
  }
  if (member.deleted || member.is_bot) {
    return false;
  }
  if (member.is_restricted || member.is_ultra_restricted) {
    return false;
  }
  return true;
}

export function pickRandom<T>(
  items: T[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = copy[i];
    const swap = copy[j];
    if (current === undefined || swap === undefined) {
      continue;
    }
    copy[i] = swap;
    copy[j] = current;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export type RecipientCandidate = {
  userId: string;
  hash: string;
};

export function selectRecipients(params: {
  members: SlackMember[];
  existingHashes: Iterable<string>;
  hmacSecret: string;
  count: number;
  botUserId: string;
  random?: () => number;
}): RecipientCandidate[] {
  const alreadySent = new Set(params.existingHashes);
  const unused: RecipientCandidate[] = [];

  for (const member of params.members) {
    if (!isEligibleMember(member, params.botUserId) || !member.id) {
      continue;
    }
    const hash = hmacUserId(params.hmacSecret, member.id);
    if (alreadySent.has(hash)) {
      continue;
    }
    unused.push({ userId: member.id, hash });
  }

  return pickRandom(unused, params.count, params.random);
}

import { timingSafeEqual } from "node:crypto";

export function bearerMatches(
  header: string | undefined,
  token: string,
): boolean {
  const prefix = "Bearer ";
  if (!header?.startsWith(prefix)) {
    return false;
  }
  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(token);
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

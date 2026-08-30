import { createHmac } from "node:crypto";

export function hmacUserId(secret: string, slackUserId: string): string {
  return createHmac("sha256", secret).update(slackUserId).digest("hex");
}

import type { IncomingMessage, ServerResponse } from "node:http";
import { dispatchAdmin } from "./handler.js";
import type { Deps } from "../types.js";

type ExpressLikeRouter = {
  use: (
    handler: (
      req: IncomingMessage,
      res: ServerResponse,
      next: () => void,
    ) => void,
  ) => void;
};

export async function handlePublicHttp(
  req: IncomingMessage,
  res: ServerResponse,
  deps: Deps,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (url.pathname.startsWith("/admin")) {
    await handleAdminHttp(req, res, deps);
    return;
  }
  res.writeHead(404);
  res.end();
}

export function attachAdminRoutes(router: ExpressLikeRouter, deps: Deps): void {
  if (!deps.config.adminApiToken) {
    return;
  }
  router.use((req, res, next) => {
    const url = req.url ?? "";
    if (!url.startsWith("/admin")) {
      next();
      return;
    }
    void handleAdminHttp(req, res, deps).catch(() => {
      deps.logger.error("admin http failed");
      if (!res.headersSent) {
        sendJson(res, 500, { error: "internal error" });
      }
    });
  });
}

export async function handleAdminHttp(
  req: IncomingMessage,
  res: ServerResponse,
  deps: Deps,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const authorization = headerValue(req.headers.authorization);
  const response = await dispatchAdmin(deps, {
    method: req.method ?? "GET",
    pathname: url.pathname,
    searchParams: url.searchParams,
    authorization,
  });
  sendJson(res, response.status, response.body);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

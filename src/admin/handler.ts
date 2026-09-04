import { bearerMatches } from "./auth.js";
import { AdminHttpError, isAdminHttpError } from "./errors.js";
import {
  approveAnswer,
  approveQuestion,
  rejectAnswer,
  rejectQuestion,
} from "./moderation.js";
import { listAnswers, listQuestions, parseStatus } from "./queries.js";
import { postAnswerById } from "../jobs/post-answers.js";
import { sendQuestionById } from "../jobs/send-questions.js";
import type { Deps } from "../types.js";

export type AdminRequest = {
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
  authorization: string | undefined;
};

export type AdminResponse = {
  status: number;
  body: unknown;
};

const QUESTION_ACTION = /^\/admin\/questions\/(\d+)\/(approve|reject|send)$/;
const ANSWER_ACTION = /^\/admin\/answers\/(\d+)\/(approve|reject|post)$/;

export async function dispatchAdmin(
  deps: Deps,
  request: AdminRequest,
): Promise<AdminResponse> {
  const token = deps.config.adminApiToken;
  if (!token) {
    return { status: 404, body: { error: "not found" } };
  }
  if (!bearerMatches(request.authorization, token)) {
    return { status: 401, body: { error: "unauthorized" } };
  }

  try {
    const body = await routeAdmin(deps, request);
    return { status: 200, body };
  } catch (error) {
    if (isAdminHttpError(error)) {
      return { status: error.status, body: { error: error.message } };
    }
    throw error;
  }
}

async function routeAdmin(deps: Deps, request: AdminRequest): Promise<unknown> {
  const now = (deps.now ?? (() => new Date()))();
  const { method, pathname } = request;

  if (pathname === "/admin/questions" && method === "GET") {
    return listQuestions(deps.db, parseStatus(request.searchParams.get("status")), now);
  }
  if (pathname === "/admin/answers" && method === "GET") {
    return listAnswers(deps.db, parseStatus(request.searchParams.get("status")));
  }

  const questionMatch = pathname.match(QUESTION_ACTION);
  if (questionMatch) {
    if (method !== "POST") {
      throw new AdminHttpError(405, "method not allowed");
    }
    const id = Number(questionMatch[1]);
    const action = questionMatch[2];
    if (action === "approve") {
      await approveQuestion(deps.db, id, now);
      return { ok: true };
    }
    if (action === "reject") {
      await rejectQuestion(deps.db, id, now);
      return { ok: true };
    }
    return sendQuestionById(deps, id);
  }

  const answerMatch = pathname.match(ANSWER_ACTION);
  if (answerMatch) {
    if (method !== "POST") {
      throw new AdminHttpError(405, "method not allowed");
    }
    const id = Number(answerMatch[1]);
    const action = answerMatch[2];
    if (action === "approve") {
      await approveAnswer(deps.db, id);
      return { ok: true };
    }
    if (action === "reject") {
      await rejectAnswer(deps.db, id);
      return { ok: true };
    }
    return postAnswerById(deps, id);
  }

  throw new AdminHttpError(404, "not found");
}

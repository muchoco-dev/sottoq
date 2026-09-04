export class AdminHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminHttpError";
    this.status = status;
  }
}

export function isAdminHttpError(error: unknown): error is AdminHttpError {
  return error instanceof AdminHttpError;
}

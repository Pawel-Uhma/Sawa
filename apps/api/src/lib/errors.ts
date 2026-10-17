import type { ApiError } from "@sawa/shared";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const STATUS_BY_CODE = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500,
} as const satisfies Record<string, ContentfulStatusCode>;

export type ErrorCode = keyof typeof STATUS_BY_CODE;

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }

  get status(): ContentfulStatusCode {
    return STATUS_BY_CODE[this.code];
  }
}

export function toErrorBody(code: ErrorCode, message: string): ApiError {
  return { error: { code, message } };
}

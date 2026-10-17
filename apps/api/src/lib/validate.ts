import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";
import { AppError } from "./errors";

/** Validators that answer with the shared ApiError shape instead of zod's raw output. */

export function jsonBody<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result) => {
    if (!result.success) throw validationError(result.error.issues);
  });
}

export function queryParams<T extends ZodType>(schema: T) {
  return zValidator("query", schema, (result) => {
    if (!result.success) throw validationError(result.error.issues);
  });
}

function validationError(issues: { path: PropertyKey[]; message: string }[]) {
  const message = issues
    .map((issue) => `${issue.path.map(String).join(".") || "input"}: ${issue.message}`)
    .join("; ");
  return new AppError("VALIDATION", message);
}

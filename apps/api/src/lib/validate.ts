import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";
import { AppError } from "./errors";

/** JSON body validator that answers with the shared ApiError shape instead of zod's raw output. */
export function jsonBody<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result) => {
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      throw new AppError("VALIDATION", message);
    }
  });
}

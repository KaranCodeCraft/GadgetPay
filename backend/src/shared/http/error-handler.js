import { fail } from "./response.js";

export function errorHandler(err, req, res, next) {
  const isZodError = err?.name === "ZodError";
  const normalizedError = isZodError
    ? {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.issues,
      }
    : err;

  const status = normalizedError.statusCode || 500;

  if (status >= 500) {
    console.error("[backend-error]", {
      requestId: req.requestId,
      path: req.originalUrl,
      method: req.method,
      message: normalizedError.message,
      stack: normalizedError.stack,
    });
  }

  res.status(status).json(fail(normalizedError, req.requestId));
}

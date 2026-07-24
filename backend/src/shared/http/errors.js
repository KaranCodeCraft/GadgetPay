export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new AppError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not Found") {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflict(message = "Conflict") {
  return new AppError(409, "CONFLICT", message);
}

export function upstreamError(message = "Upstream service error", details) {
  return new AppError(502, "UPSTREAM_ERROR", message, details);
}

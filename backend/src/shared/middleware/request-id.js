import crypto from "crypto";

export function requestIdMiddleware(req, res, next) {
  req.requestId = req.header("x-request-id") || crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}

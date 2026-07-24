import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { forbidden, unauthorized } from "../http/errors.js";

export function requireAuth(req, res, next) {
  const authHeader = req.header("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return next(unauthorized("Missing bearer token"));
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    req.auth = jwt.verify(token, env.jwtAccessSecret);
    next();
  } catch {
    next(unauthorized("Invalid or expired access token"));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth?.role) {
      return next(unauthorized("Auth context missing role"));
    }

    if (!roles.includes(req.auth.role)) {
      return next(forbidden("Insufficient role"));
    }

    next();
  };
}

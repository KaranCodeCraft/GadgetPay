import cors from "cors";
import express from "express";
import { v1Router } from "./api/v1/index.js";
import { errorHandler } from "./shared/http/error-handler.js";
import { notFound } from "./shared/http/errors.js";
import { requestIdMiddleware } from "./shared/middleware/request-id.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gadgetpe-backend" });
});

app.use("/api/v1", v1Router);

app.use((req, res, next) => {
  next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

import { PrismaClient } from "@prisma/client";

export const prisma = globalThis.__gadgetpePrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalThis.__gadgetpePrisma = prisma;
}

export default prisma;

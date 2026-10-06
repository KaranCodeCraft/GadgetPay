import { PrismaClient } from "@prisma/client";

export const prisma = globalThis.__gadgetpePrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Wrap query engine with reconnect-on-stale-connection logic (P1001 / P1017)
// This is needed when connecting through an SSH tunnel that drops idle sockets.
const _original$queryRaw = prisma.$queryRaw.bind(prisma);
async function withReconnect(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.code === "P1001" || err?.code === "P1017") {
      // Stale connection through SSH tunnel — reconnect and retry once
      try { await prisma.$disconnect(); } catch (_) {}
      await prisma.$connect();
      return await fn();
    }
    throw err;
  }
}

// Proxy all prisma model calls through reconnect wrapper
const handler = {
  get(target, prop) {
    const value = target[prop];
    if (
      value &&
      typeof value === "object" &&
      !prop.startsWith("$") &&
      !prop.startsWith("_")
    ) {
      return new Proxy(value, {
        get(modelTarget, methodName) {
          const method = modelTarget[methodName];
          if (typeof method === "function") {
            return (...args) => withReconnect(() => method.apply(modelTarget, args));
          }
          return method;
        },
      });
    }
    return value;
  },
};

export const prismaWithReconnect = new Proxy(prisma, handler);

if (process.env.NODE_ENV !== "production") {
  globalThis.__gadgetpePrisma = prisma;
}

export default prisma;

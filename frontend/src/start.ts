import { createStart, createMiddleware } from "@tanstack/react-start";
import { registerSW } from "virtual:pwa-register";

import { renderErrorPage } from "./lib/error-page";

if (typeof window !== "undefined") {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info("GadgetPe is ready for offline app-shell usage.");
    },
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
    },
  });
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));

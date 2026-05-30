import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
  base: {
    service: "setka-web",
    version: process.env.APP_VERSION ?? "0.1.0",
  },
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
